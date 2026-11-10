import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const todayInUganda = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const url = `${ctx.url}/rest/v1/payments?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,workspace_id,invoice_id,receipt_number,payment_reference,payment_date,amount,currency,exchange_rate,method,notes,received_by,created_at,invoices(id,invoice_number,issue_date,due_date,total,amount_paid,status,contact_id,business_contacts(name,email,phone))&order=payment_date.desc,created_at.desc&limit=500`;
  const response = await fetch(url, {
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Payments list request failed", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Unable to load payments." }, { status: 502 });
  }
  return NextResponse.json({ payments: await response.json() });
}

export async function PATCH(request: import("next/server").NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 }); }
  const str = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const id = str(body.id, 64);
  const paymentDate = str(body.payment_date, 10);
  const method = str(body.method, 30);
  const reference = str(body.payment_reference, 120);
  const notes = str(body.notes, 1000);
  const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
  if (!validUuid.test(id)) return NextResponse.json({ error: "Select a valid payment record." }, { status: 400 });
  if (!validDate(paymentDate) || paymentDate > todayInUganda()) return NextResponse.json({ error: "Payment date must be valid and cannot be in the future." }, { status: 400 });
  if (!["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"].includes(method)) return NextResponse.json({ error: "Choose a supported payment method." }, { status: 400 });

  // Only metadata is editable here. Amount and invoice linkage remain immutable to protect reconciled balances.
  const response = await fetch(`${ctx.url}/rest/v1/payments?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, {
    method: "PATCH",
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ payment_date: paymentDate, method, payment_reference: reference || null, notes: notes || null }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Payment metadata update failed", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Payment details could not be updated." }, { status: 502 });
  }
  const updated = await response.json();
  if (!Array.isArray(updated) || !updated.length) return NextResponse.json({ error: "Payment was not found in this workspace." }, { status: 404 });
  return NextResponse.json({ payment: updated[0] });
}

export async function POST(request: import("next/server").NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 }); }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const id = str(body.invoice_id, 64);
  const amount = Number(body.amount);
  const method = str(body.method, 30);
  const paymentDate = str(body.payment_date, 10) || todayInUganda();
  const reference = str(body.payment_reference, 120);
  const notes = str(body.notes, 1000);
  const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;

  if (!validUuid.test(id)) return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999999999999) {
    return NextResponse.json({ error: "Enter a valid positive payment amount." }, { status: 400 });
  }
  if (!validDate(paymentDate) || paymentDate > todayInUganda()) {
    return NextResponse.json({ error: "Payment date must be valid and cannot be in the future." }, { status: 400 });
  }
  if (!["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"].includes(method)) {
    return NextResponse.json({ error: "Choose a supported payment method." }, { status: 400 });
  }

  const response = await fetch(`${ctx.url}/rest/v1/rpc/record_workspace_invoice_payment`, {
    method: "POST",
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_invoice_id: id,
      p_received_by: ctx.session.user.id,
      p_amount: Math.round(amount * 100) / 100,
      p_payment_date: paymentDate,
      p_method: method,
      p_payment_reference: reference || null,
      p_notes: notes || null,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 400 || response.status === 404 || response.status === 409) {
      return NextResponse.json({ error: "Payment was rejected. Check the invoice status and outstanding balance." }, { status: 409 });
    }
    console.error("Invoice payment RPC failed", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Payment could not be recorded. No payment confirmation was returned." }, { status: 502 });
  }

  const result = await response.json();
  if (!result || !result.payment_id || !result.invoice_id) {
    return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 502 });
  }
  return NextResponse.json({ payment: result }, { status: 201 });
}
