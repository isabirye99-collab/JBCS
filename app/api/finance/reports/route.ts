
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function config() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getWorkspaceId(url: string, key: string) {
  const response = await fetch(
    `${url}/rest/v1/business_workspaces?slug=eq.jbcs&is_active=eq.true&select=id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1 ? rows[0].id : null;
}

function currentBusinessDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}

function totalsByCurrency(
  rows: Record<string, unknown>[],
  field: string
) {
  const totals: Record<string, number> = {};

  for (const row of rows) {
    const currency = String(row.currency || "UGX").toUpperCase();
    const value = Number(row[field] || 0);

    if (Number.isFinite(value)) {
      totals[currency] = (totals[currency] || 0) + value;
    }
  }

  return Object.fromEntries(
    Object.entries(totals).map(([currency, total]) => [
      currency,
      Math.round(total * 100) / 100,
    ])
  );
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);

  const { url, key } = config();
  if (!url || !key) {
    return fail("Finance database configuration is missing.", 503);
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const validDate = (value: string | null) =>
    !value ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);

  if (!validDate(from) || !validDate(to) || (from && to && from > to)) {
    return fail("Enter a valid reporting date range.");
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) {
      return fail("JBCS workspace not found or inactive.", 503);
    }

    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
    };

    async function loadTable(
      table: string,
      select: string,
      dateField: string
    ): Promise<Record<string, unknown>[]> {
      const params = new URLSearchParams({
        workspace_id: `eq.${workspaceId}`,
        select,
        order: `${dateField}.desc`,
      });

      if (from) params.append(dateField, `gte.${from}`);
      if (to) params.append(dateField, `lte.${to}`);
      const allRows: Record<string, unknown>[] = [];
      const pageSize = 1000;

      for (let offset = 0; ; offset += pageSize) {
        const response = await fetch(
          `${url}/rest/v1/${table}?${params.toString()}`,
          {
            headers: {
              ...headers,
              "Range-Unit": "items",
              Range: `${offset}-${offset + pageSize - 1}`,
            },
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${table}: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error(`Unexpected response from ${table}`);
        }

        allRows.push(...data);
        if (data.length < pageSize) break;
      }

      return allRows;
    }

    const [invoices, payments, expenses] = await Promise.all([
      loadTable(
        "invoices",
        "id,invoice_number,currency,total,amount_paid,status,issue_date,due_date",
        "issue_date"
      ),
      loadTable(
        "payments",
        "id,invoice_id,currency,amount,payment_date,method",
        "payment_date"
      ),
      loadTable(
        "expenses",
        "id,currency,amount,expense_date,category,description",
        "expense_date"
      ),
    ]);

    const activeInvoices = invoices.filter(
      (invoice) => invoice.status !== "void"
    );

    const outstandingInvoices = activeInvoices.filter(
      (invoice) =>
        Number(invoice.total || 0) > Number(invoice.amount_paid || 0)
    );

    const overdueInvoices = outstandingInvoices.filter(
      (invoice) =>
        invoice.due_date &&
        String(invoice.due_date) < currentBusinessDate() &&
        !["draft", "void"].includes(String(invoice.status))
    );

    return NextResponse.json({
      period: { from: from || null, to: to || null },
      summary: {
        invoiceCount: activeInvoices.length,
        paymentCount: payments.length,
        expenseCount: expenses.length,
        outstandingInvoiceCount: outstandingInvoices.length,
        overdueInvoiceCount: overdueInvoices.length,
        invoicedByCurrency: totalsByCurrency(activeInvoices, "total"),
        collectedByCurrency: totalsByCurrency(payments, "amount"),
        expensesByCurrency: totalsByCurrency(expenses, "amount"),
        outstandingByCurrency: totalsByCurrency(
          outstandingInvoices.map((invoice) => ({
            currency: invoice.currency,
            amount:
              Number(invoice.total || 0) -
              Number(invoice.amount_paid || 0),
          })),
          "amount"
        ),
      },
      invoices,
      payments,
      expenses,
    });
  } catch (error) {
    console.error("Finance reports error:", error);
    return fail("Unable to generate financial reports.", 502);
  }
}
