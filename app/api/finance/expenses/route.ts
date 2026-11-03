import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

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

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return error("Unauthorised", 401);
  }

  const { url, key } = config();

  if (!url || !key) {
    return error("Finance database configuration is missing.", 503);
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);

    if (!workspaceId) {
      return error("JBCS workspace not found or inactive.", 503);
    }

    const params = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      select:
        "id,expense_date,category,description,supplier_contact_id,amount,currency,exchange_rate,payment_method,receipt_url,notes,created_at,business_contacts(name)",
      order: "expense_date.desc,created_at.desc",
    });

    const search = request.nextUrl.searchParams.get("search")?.trim();

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, " ").trim();

      if (safeSearch) {
        params.set(
          "or",
          `(description.ilike.*${safeSearch}*,category.ilike.*${safeSearch}*)`
        );
      }
    }

    const response = await fetch(
      `${url}/rest/v1/expenses?${params.toString()}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return error("Unable to load expenses.", 502);
    }

    return NextResponse.json({ expenses: await response.json() });
  } catch {
    return error("Unable to connect to the finance database.", 502);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return error("Unauthorised", 401);
  }

  const { url, key } = config();

  if (!url || !key) {
    return error("Finance database configuration is missing.", 503);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return error("Invalid expense details.");
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const amount = Number(body.amount);
  const exchangeRate = Number(body.exchange_rate ?? 1);
  const expenseDate = str(body.expense_date, 10);
  const category = str(body.category, 100);
  const description = str(body.description, 500);
  const currency = str(body.currency || "UGX", 3).toUpperCase();
  const paymentMethod = str(body.payment_method || "other", 30);
  const notes = str(body.notes, 2000);
  const receiptUrl = str(body.receipt_url, 2000);
  const supplierId = str(body.supplier_contact_id, 36) || null;

  const allowedMethods = [
    "cash",
    "bank_transfer",
    "mobile_money",
    "card",
    "cheque",
    "other",
  ];

  const validExpenseDate =
    /^\d{4}-\d{2}-\d{2}$/.test(expenseDate) &&
    !Number.isNaN(Date.parse(`${expenseDate}T00:00:00Z`)) &&
    new Date(`${expenseDate}T00:00:00Z`).toISOString().slice(0, 10) === expenseDate;

  if (
    !validExpenseDate ||
    !category ||
    !description ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9_999_999_999_999_999 ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    exchangeRate > 999_999_999_999 ||
    !/^[A-Z]{3}$/.test(currency) ||
    !allowedMethods.includes(paymentMethod)
  ) {
    return error(
      "Enter a valid date, category, description, positive amount, exchange rate, currency and payment method."
    );
  }

  if (supplierId && !/^[0-9a-f-]{36}$/i.test(supplierId)) {
    return error("Select a valid supplier.");
  }

  if (receiptUrl) {
    try {
      const parsed = new URL(receiptUrl);
      if (!["https:", "http:"].includes(parsed.protocol)) {
        return error("The receipt link must be an HTTP or HTTPS URL.");
      }
    } catch {
      return error("Enter a valid receipt URL.");
    }
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);

    if (!workspaceId) {
      return error("JBCS workspace not found or inactive.", 503);
    }

    if (supplierId) {
      const supplierResponse = await fetch(
        `${url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(
          supplierId
        )}&workspace_id=eq.${encodeURIComponent(
          workspaceId
        )}&contact_type=eq.supplier&select=id&limit=1`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: "no-store",
        }
      );

      if (!supplierResponse.ok) {
        return error("Unable to validate the selected supplier.", 502);
      }

      const suppliers = await supplierResponse.json();

      if (!Array.isArray(suppliers) || suppliers.length !== 1) {
        return error("The selected supplier was not found in this workspace.");
      }
    }

    const payload = {
      workspace_id: workspaceId,
      expense_date: expenseDate,
      category,
      description,
      supplier_contact_id: supplierId,
      amount,
      currency,
      exchange_rate: exchangeRate,
      payment_method: paymentMethod,
      receipt_url: receiptUrl || null,
      notes: notes || null,
    };

    const response = await fetch(`${url}/rest/v1/expenses?select=*`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("Expense creation failed:", response.status, details);
      return error("Unable to save the expense. Check the submitted details.", 502);
    }

    const rows = await response.json();

    if (!Array.isArray(rows) || rows.length !== 1) {
      return error("The expense could not be confirmed as saved.", 502);
    }

    return NextResponse.json({ expense: rows[0] }, { status: 201 });
  } catch {
    return error("Unable to connect to the finance database.", 502);
  }
}
