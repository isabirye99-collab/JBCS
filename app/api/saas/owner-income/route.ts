import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";
import { hasSaasFeature, saasFeatureError } from "@/lib/saas-entitlements";

export const dynamic = "force-dynamic";
const methods = ["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"];
const clean = (v: unknown, max = 500) => typeof v === "string" ? v.trim().slice(0, max) : "";
const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const headers = (ctx: { serviceKey: string }) => ({ apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` });

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!hasSaasFeature(ctx, "full_accounting")) return NextResponse.json({ error: saasFeatureError("full_accounting") }, { status: 403 });
  const response = await fetch(`${ctx.url}/rest/v1/owner_income_entries?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,entry_type,recipient,category,payer,description,earned_date,expected_payment_date,amount,amount_received,currency,payment_method,payment_reference,status,notes,created_at&order=earned_date.desc&limit=500`, { headers: headers(ctx), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Unable to load owner income records." }, { status: 502 });
  const entries = await response.json();
  const paymentsResponse = await fetch(`${ctx.url}/rest/v1/owner_commission_payments?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,entry_id,payment_date,amount,currency,payment_method,payment_reference,notes,created_at&order=payment_date.desc&limit=1000`, { headers: headers(ctx), cache: "no-store" });
  const payments = paymentsResponse.ok ? await paymentsResponse.json() : [];
  return NextResponse.json({ entries, payments });
}


export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!hasSaasFeature(ctx, "full_accounting")) return NextResponse.json({ error: saasFeatureError("full_accounting") }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid details." }, { status: 400 }); }
  const id = clean(body.id, 64);
  const entryType = clean(body.entry_type, 30);
  const recipient = clean(body.recipient, 30);
  const category = clean(body.category, 100);
  const payer = clean(body.payer, 200);
  const description = clean(body.description, 500);
  const earnedDate = clean(body.earned_date, 10);
  const expectedDate = clean(body.expected_payment_date, 10);
  const amount = Number(body.amount);
  const currency = clean(body.currency || "UGX", 3).toUpperCase();
  const notes = clean(body.notes, 2000);
  if (!id || !["owner_income", "commission"].includes(entryType) || !["owner", "business"].includes(recipient) || !category || !payer || !description || !dateOk(earnedDate) || (expectedDate && !dateOk(expectedDate))) {
    return NextResponse.json({ error: "Complete the required fields and use valid dates." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Enter a valid amount and three-letter currency." }, { status: 400 });
  }
  const base = `${ctx.url}/rest/v1`;
  const h = headers(ctx);
  const existingResponse = await fetch(`${base}/owner_income_entries?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,amount_received,currency,status,entry_type&limit=1`, { headers: h, cache: "no-store" });
  if (!existingResponse.ok) return NextResponse.json({ error: "Unable to verify the existing record." }, { status: 502 });
  const existingRows = await existingResponse.json();
  const existing = Array.isArray(existingRows) ? existingRows[0] : null;
  if (!existing) return NextResponse.json({ error: "Record not found in this workspace." }, { status: 404 });
  const received = Number(existing.amount_received || 0);
  if (amount < received) return NextResponse.json({ error: "The amount cannot be lower than payments already received." }, { status: 400 });
  if (received > 0 && entryType !== String(existing.entry_type)) return NextResponse.json({ error: "Record type cannot be changed after payments have been recorded." }, { status: 400 });
  if (received > 0 && currency !== String(existing.currency || "UGX").trim()) return NextResponse.json({ error: "Currency cannot be changed after payments have been recorded." }, { status: 400 });
  const status = existing.status === "cancelled" ? "cancelled" : received >= amount ? "paid" : received > 0 ? "partially_paid" : "pending";
  const response = await fetch(`${base}/owner_income_entries?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, {
    method: "PATCH",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ entry_type: entryType, recipient, category, payer, description, earned_date: earnedDate, expected_payment_date: expectedDate || null, amount, currency, notes: notes || null, status, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update the owner income record." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ entry: Array.isArray(rows) ? rows[0] : null }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!hasSaasFeature(ctx, "full_accounting")) return NextResponse.json({ error: saasFeatureError("full_accounting") }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid details." }, { status: 400 }); }
  const base = `${ctx.url}/rest/v1`;
  const h = headers(ctx);
  if (body.action === "record_payment") {
    const entryId = clean(body.entry_id, 64);
    const paymentDate = clean(body.payment_date, 10) || new Date().toISOString().slice(0, 10);
    const amount = Number(body.amount);
    const currency = clean(body.currency || "UGX", 3).toUpperCase();
    const paymentMethod = clean(body.payment_method || "other", 30);
    if (!entryId || !dateOk(paymentDate) || paymentDate > new Date().toISOString().slice(0, 10) || !Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(currency) || !methods.includes(paymentMethod)) {
      return NextResponse.json({ error: "Enter a valid payment date (not in the future), amount, currency and method." }, { status: 400 });
    }
    const response = await fetch(`${base}/rpc/record_owner_commission_payment`, {
      method: "POST", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ p_workspace_id: ctx.workspaceId, p_entry_id: entryId, p_payment_date: paymentDate, p_amount: amount, p_currency: currency, p_payment_method: paymentMethod, p_payment_reference: clean(body.payment_reference, 200) || null, p_notes: clean(body.notes, 2000) || null, p_recorded_by: ctx.session.user.id }),
      cache: "no-store",
    });
    if (!response.ok) {
      const raw = await response.text();
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail = String(parsed.message || parsed.error || raw);
      } catch {}
      const reason = detail.toLowerCase();
      const message = reason.includes("exceed") || reason.includes("outstanding")
        ? "Payment exceeds the outstanding balance. Check the amount still due."
        : reason.includes("currency")
          ? "Payment currency must match the selected income record."
          : reason.includes("cancelled")
            ? "Cancelled income records cannot receive payments."
            : reason.includes("not found")
              ? "The income record could not be found in this workspace. Refresh and try again."
              : reason.includes("payment amount") || reason.includes("greater than zero")
                ? "Enter a payment amount greater than zero."
                : "Could not record the payment. Refresh the register and try again; if the problem continues, check the database migration and server logs.";
      console.error("Owner income payment RPC failed", response.status, detail.slice(0, 300));
      return NextResponse.json({ error: message }, { status: response.status === 400 ? 400 : 502 });
    }
    return NextResponse.json({ success: true }, { status: 201 });
  }

  const entryType = clean(body.entry_type, 30);
  const recipient = clean(body.recipient, 30);
  const category = clean(body.category, 100);
  const payer = clean(body.payer, 200);
  const description = clean(body.description, 500);
  const earnedDate = clean(body.earned_date, 10);
  const expectedDate = clean(body.expected_payment_date, 10);
  const amount = Number(body.amount);
  const currency = clean(body.currency || "UGX", 3).toUpperCase();
  const notes = clean(body.notes, 2000);
  if (!["owner_income", "commission"].includes(entryType) || !["owner", "business"].includes(recipient) || !category || !payer || !description || !dateOk(earnedDate) || (expectedDate && !dateOk(expectedDate))) {
    return NextResponse.json({ error: "Complete the required fields and use valid dates." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12 || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Enter a valid amount and three-letter currency." }, { status: 400 });
  }
  const response = await fetch(`${base}/owner_income_entries`, {
    method: "POST", headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: ctx.workspaceId, entry_type: entryType, recipient, category, payer, description, earned_date: earnedDate, expected_payment_date: expectedDate || null, amount, amount_received: 0, currency, status: "pending", notes: notes || null, created_by: ctx.session.user.id }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save the owner income record." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ entry: Array.isArray(rows) ? rows[0] : null }, { status: 201 });
}
