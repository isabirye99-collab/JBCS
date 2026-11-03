
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function config() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);

  const { url, key } = config();
  if (!url || !key) return fail("Finance database configuration is missing.", 503);

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) return fail("JBCS workspace not found or inactive.", 503);

    const params = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      select:
        "id,invoice_id,payment_reference,payment_date,amount,currency,exchange_rate,method,notes,created_at,invoices(invoice_number,total,amount_paid,status,business_contacts(name))",
      order: "payment_date.desc,created_at.desc",
    });

    const response = await fetch(`${url}/rest/v1/payments?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!response.ok) return fail("Unable to load payments.", 502);

    return NextResponse.json({ payments: await response.json() });
  } catch {
    return fail("Unable to connect to the finance database.", 502);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);

  const { url, key } = config();
  if (!url || !key) return fail("Finance database configuration is missing.", 503);

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return fail("Invalid payment details.");
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const invoiceId = str(body.invoice_id, 36);
  const paymentDate = str(body.payment_date, 10);
  const amount = Number(body.amount);
  const exchangeRate = Number(body.exchange_rate ?? 1);
  const method = str(body.method || "other", 30);
  const reference = str(body.payment_reference, 100);
  const notes = str(body.notes, 2000);

  const allowedMethods = [
    "cash",
    "bank_transfer",
    "mobile_money",
    "card",
    "cheque",
    "other",
  ];

  const validPaymentDate =
    /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) &&
    !Number.isNaN(Date.parse(`${paymentDate}T00:00:00Z`)) &&
    new Date(`${paymentDate}T00:00:00Z`).toISOString().slice(0, 10) === paymentDate;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoiceId) ||
    !validPaymentDate ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9_999_999_999_999_999 ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    exchangeRate > 999_999_999_999 ||
    !allowedMethods.includes(method)
  ) {
    return fail("Enter a valid invoice, date, amount, exchange rate and payment method.");
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) return fail("JBCS workspace not found or inactive.", 503);

    const rpcResponse = await fetch(
      `${url}/rest/v1/rpc/record_jbcs_invoice_payment`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_workspace_id: workspaceId,
          p_invoice_id: invoiceId,
          p_payment_date: paymentDate,
          p_amount: amount,
          p_exchange_rate: exchangeRate,
          p_method: method,
          p_payment_reference: reference || null,
          p_notes: notes || null,
        }),
        cache: "no-store",
      }
    );

    if (!rpcResponse.ok) {
      const details = await rpcResponse.text();
      console.error("Atomic payment recording failed:", rpcResponse.status, details);
      if (rpcResponse.status === 404) {
        return fail("The atomic payment database function is not available yet. Apply the latest Supabase migration before recording payments.", 503);
      }
      return fail(
        "The payment could not be recorded. Check that the invoice has an outstanding balance and try again.",
        rpcResponse.status === 409 ? 409 : 400
      );
    }

    const result = await rpcResponse.json();
    if (!result?.payment?.id || !result?.invoice?.id) {
      return fail("The database did not confirm the payment and invoice update.", 502);
    }

    return NextResponse.json(result, { status: 201 });
  } catch {
    return fail("Unable to connect to the finance database.", 502);
  }
}
