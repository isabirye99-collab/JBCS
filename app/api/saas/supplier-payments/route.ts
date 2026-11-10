
import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";
import { hasSaasFeature, saasFeatureError } from "@/lib/saas-entitlements";

export const dynamic = "force-dynamic";

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

const dateOk = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

const methods = [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
];

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const base = `${ctx.url}/rest/v1`;
  const headers = {
    apikey: ctx.serviceKey,
    Authorization: `Bearer ${ctx.serviceKey}`,
  };
  const workspace = encodeURIComponent(ctx.workspaceId);

  const r = await fetch(
    `${base}/supplier_payments?workspace_id=eq.${workspace}&select=id,supplier_contact_id,expense_id,invoice_id,payment_date,amount,currency,payment_method,payment_reference,notes,created_at&order=payment_date.desc&limit=500`,
    { headers, cache: "no-store" },
  );

  if (!r.ok) {
    return NextResponse.json({ payments: [], migration_required: true });
  }

  const rows = (await r.json()) as Array<Record<string, unknown>>;
  const supplierIds = [...new Set(rows.map((x) => String(x.supplier_contact_id || "")).filter(Boolean))];
  const expenseIds = [...new Set(rows.map((x) => String(x.expense_id || "")).filter(Boolean))];
  const invoiceIds = [...new Set(rows.map((x) => String(x.invoice_id || "")).filter(Boolean))];

  const [sr, er, ir] = await Promise.all([
    supplierIds.length
      ? fetch(`${base}/business_contacts?workspace_id=eq.${workspace}&id=in.(${supplierIds.join(",")})&select=id,name`, { headers, cache: "no-store" })
      : Promise.resolve(null),
    expenseIds.length
      ? fetch(`${base}/expenses?workspace_id=eq.${workspace}&id=in.(${expenseIds.join(",")})&select=id,description`, { headers, cache: "no-store" })
      : Promise.resolve(null),
    invoiceIds.length
      ? fetch(`${base}/invoices?workspace_id=eq.${workspace}&id=in.(${invoiceIds.join(",")})&select=id,invoice_number,contact_id`, { headers, cache: "no-store" })
      : Promise.resolve(null),
  ]);

  const suppliers = sr?.ok ? await sr.json() as Array<{ id: string; name: string }> : [];
  const expenses = er?.ok ? await er.json() as Array<{ id: string; description: string }> : [];
  const invoices = ir?.ok ? await ir.json() as Array<{ id: string; invoice_number: string; contact_id?: string | null }> : [];

  const sn = Object.fromEntries(suppliers.map((x) => [x.id, x.name]));
  const en = Object.fromEntries(expenses.map((x) => [x.id, x.description]));
  const inv = Object.fromEntries(invoices.map((x) => [x.id, x.invoice_number]));

  return NextResponse.json({
    payments: rows.map((x) => ({
      ...x,
      supplier_name: sn[String(x.supplier_contact_id)] || null,
      expense_description: x.expense_id ? en[String(x.expense_id)] || null : null,
      invoice_number: x.invoice_id ? inv[String(x.invoice_id)] || null : null,
    })),
    migration_required: false,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid supplier payment details." }, { status: 400 });
  }

  const supplierId = clean(body.supplier_contact_id, 64);
  const expenseId = clean(body.expense_id, 64);
  const invoiceId = clean(body.invoice_id, 64);
  const paymentDate = clean(body.payment_date, 10) || new Date().toISOString().slice(0, 10);
  const amount = Number(body.amount);
  const currency = clean(body.currency || "UGX", 3).toUpperCase();
  const method = clean(body.payment_method || "other", 30);
  const reference = clean(body.payment_reference, 150);
  const notes = clean(body.notes, 2000);

  if (!supplierId || !dateOk(paymentDate)) {
    return NextResponse.json({ error: "Choose a supplier and enter a valid payment date." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    return NextResponse.json({ error: "Enter a valid payment amount greater than zero." }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Use a valid three-letter currency." }, { status: 400 });
  }
  if (!methods.includes(method)) {
    return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
  }

  const response = await fetch(
    `${ctx.url}/rest/v1/rpc/record_workspace_supplier_payment`,
    {
      method: "POST",
      headers: {
        apikey: ctx.serviceKey,
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_workspace_id: ctx.workspaceId,
        p_supplier_contact_id: supplierId,
        p_expense_id: expenseId || null,
        p_invoice_id: invoiceId || null,
        p_payment_date: paymentDate,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: method,
        p_payment_reference: reference || null,
        p_notes: notes || null,
        p_recorded_by: ctx.session.user.id,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let msg = "Could not save supplier payment. Check the database setup and payment details.";
    try {
      const d = await response.json();
      if (d.message) msg = String(d.message);
      else if (d.details) msg = String(d.details);
    } catch {}
    return NextResponse.json({ error: msg }, { status: response.status === 400 ? 400 : 502 });
  }

  const data = await response.json();
  return NextResponse.json(
    { payment: Array.isArray(data) ? data[0] : data },
    { status: 201 },
  );
}

// Update a supplier payment without allowing cross-workspace links or overpayment.
export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter valid supplier payment details." }, { status: 400 });
  }

  const paymentId = clean(body.id, 64);
  const supplierId = clean(body.supplier_contact_id, 64);
  const expenseId = clean(body.expense_id, 64);
  const invoiceId = clean(body.invoice_id, 64);
  const paymentDate = clean(body.payment_date, 10);
  const amount = Number(body.amount);
  const currency = clean(body.currency || "UGX", 3).toUpperCase();
  const method = clean(body.payment_method || "other", 30);
  const reference = clean(body.payment_reference, 150);
  const notes = clean(body.notes, 2000);

  if (!paymentId || !supplierId || !dateOk(paymentDate)) {
    return NextResponse.json({ error: "Choose a payment and supplier, and enter a valid payment date." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12 || Math.round(amount * 100) !== amount * 100) {
    return NextResponse.json({ error: "Enter a valid payment amount with no more than two decimal places." }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Use a valid three-letter currency." }, { status: 400 });
  }
  if (!methods.includes(method)) {
    return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
  }

  const response = await fetch(`${ctx.url}/rest/v1/rpc/update_workspace_supplier_payment`, {
    method: "POST",
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_payment_id: paymentId,
      p_supplier_contact_id: supplierId,
      p_expense_id: expenseId || null,
      p_invoice_id: invoiceId || null,
      p_payment_date: paymentDate,
      p_amount: amount,
      p_currency: currency,
      p_payment_method: method,
      p_payment_reference: reference || null,
      p_notes: notes || null,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Could not update supplier payment. Check the payment details.";
    try {
      const data = await response.json();
      if (data.message) message = String(data.message);
      else if (data.details) message = String(data.details);
    } catch {}
    return NextResponse.json({ error: message }, { status: response.status === 400 ? 400 : 502 });
  }

  return NextResponse.json({ success: true, payment: await response.json() });
}
