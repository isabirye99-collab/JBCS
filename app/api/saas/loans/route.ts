import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const headers = (ctx: { serviceKey: string }) => ({
  apikey: ctx.serviceKey,
  Authorization: `Bearer ${ctx.serviceKey}`,
  "Content-Type": "application/json",
});
const base = (ctx: { url: string }) => `${ctx.url}/rest/v1`;

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const h = headers(ctx);
  const loanRes = await fetch(`${base(ctx)}/business_loans?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=*&order=created_at.desc`, { headers: h, cache: "no-store" });
  if (!loanRes.ok) return NextResponse.json({ error: "Unable to load loans." }, { status: 502 });
  const loans = await loanRes.json() as Array<Record<string, unknown>>;
  if (!loans.length) return NextResponse.json({ loans: [], installments: [] });
  const ids = loans.map((loan) => String(loan.id));
  const installmentRes = await fetch(`${base(ctx)}/business_loan_installments?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&loan_id=in.(${ids.join(",")})&select=*&order=due_date.asc&limit=1000`, { headers: h, cache: "no-store" });
  if (!installmentRes.ok) return NextResponse.json({ error: "Unable to load loan instalments." }, { status: 502 });
  return NextResponse.json({ loans, installments: await installmentRes.json() });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  const amount = Number(body.amount_paid);
  const paidDate = typeof body.paid_date === "string" ? body.paid_date : "";
  const reference = typeof body.payment_reference === "string" ? body.payment_reference.trim().slice(0, 160) : "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !Number.isFinite(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
    return NextResponse.json({ error: "Provide an instalment, a non-negative amount and a valid payment date." }, { status: 400 });
  }
  const h = { ...headers(ctx), Prefer: "return=representation" };
  const check = await fetch(`${base(ctx)}/business_loan_installments?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,scheduled_amount`, { headers: h, cache: "no-store" });
  if (!check.ok) return NextResponse.json({ error: "Could not verify instalment." }, { status: 502 });
  const matches = await check.json() as Array<{id:string;scheduled_amount:number|string}>;
  if (!matches.length) return NextResponse.json({ error: "Instalment not found in the selected workspace." }, { status: 404 });
  const scheduled = Number(matches[0].scheduled_amount);
  const status = amount === 0 ? "scheduled" : amount < scheduled ? "partial" : "paid";
  const response = await fetch(`${base(ctx)}/business_loan_installments?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, {
    method: "PATCH", headers: h,
    body: JSON.stringify({ amount_paid: amount, paid_date: amount > 0 ? paidDate : null, payment_reference: reference || null, status, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save instalment payment." }, { status: 502 });
  return NextResponse.json({ instalment: (await response.json())[0] });
}
