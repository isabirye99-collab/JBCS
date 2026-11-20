import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max = 500) => typeof v === "string" ? v.trim().slice(0, max) : "";
const headers = (ctx: { serviceKey: string }) => ({
  apikey: ctx.serviceKey,
  Authorization: `Bearer ${ctx.serviceKey}`,
  "Content-Type": "application/json",
});
const base = (ctx: { url: string }) => `${ctx.url}/rest/v1`;
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(
    `${base(ctx)}/business_obligations?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=*&order=created_at.desc&limit=2000`,
    { headers: headers(ctx), cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Unable to load money owed records. Confirm the database migration has been applied." }, { status: 502 });
  return NextResponse.json({ obligations: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid obligation details." }, { status: 400 }); }

  const obligationType = clean(body.obligation_type, 30) || "other";
  const lenderType = clean(body.lender_type, 40) || "other";
  const lenderName = clean(body.lender_name, 200);
  const description = clean(body.description, 500);
  const currency = (clean(body.currency, 3) || "UGX").toUpperCase();
  const originalAmount = Number(body.original_amount);
  const outstandingAmount = body.outstanding_amount === undefined || body.outstanding_amount === null || body.outstanding_amount === ""
    ? originalAmount : Number(body.outstanding_amount);
  const incurredDate = clean(body.received_or_incurred_date, 10) || new Date().toISOString().slice(0, 10);
  const dueDate = clean(body.due_date, 10);
  const interestType = clean(body.interest_type, 30) || "unspecified";
  const frequency = clean(body.repayment_frequency, 30) || "flexible";
  const interestRate = body.interest_rate === "" || body.interest_rate == null ? null : Number(body.interest_rate);
  const allowedTypes = ["loan", "payable", "land_debt", "other"];
  const allowedLenders = ["bank", "financial_institution", "individual", "director", "shareholder", "supplier", "land_seller", "other"];
  const allowedInterest = ["unspecified", "interest_free", "fixed", "annual_rate"];
  const allowedFrequency = ["flexible", "weekly", "monthly", "quarterly", "annually", "one_off"];

  if (!allowedTypes.includes(obligationType) || !allowedLenders.includes(lenderType) || !allowedInterest.includes(interestType) || !allowedFrequency.includes(frequency)) {
    return NextResponse.json({ error: "Choose valid obligation, lender, interest and repayment types." }, { status: 400 });
  }
  if (!lenderName || !description) return NextResponse.json({ error: "Enter the lender/payee and a description." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Use a three-letter currency code." }, { status: 400 });
  if (!Number.isFinite(originalAmount) || originalAmount <= 0 || originalAmount > 1e12 || !Number.isFinite(outstandingAmount) || outstandingAmount < 0 || outstandingAmount > originalAmount) {
    return NextResponse.json({ error: "Enter valid original and outstanding amounts." }, { status: 400 });
  }
  if (!validDate(incurredDate) || (dueDate && !validDate(dueDate))) return NextResponse.json({ error: "Enter valid dates." }, { status: 400 });
  if (interestRate !== null && (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 1000)) return NextResponse.json({ error: "Enter a valid interest rate." }, { status: 400 });

  const status = outstandingAmount === 0 ? "settled" : outstandingAmount < originalAmount ? "partially_paid" : dueDate && dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "open";
  const payload = {
    workspace_id: ctx.workspaceId, obligation_type: obligationType, lender_type: lenderType,
    lender_name: lenderName, lender_contact: clean(body.lender_contact, 200) || null,
    reference_number: clean(body.reference_number, 120) || null, description, currency,
    original_amount: originalAmount, outstanding_amount: outstandingAmount, interest_rate: interestRate,
    interest_type: interestType, received_or_incurred_date: incurredDate, due_date: dueDate || null,
    repayment_frequency: frequency, status, notes: clean(body.notes, 4000) || null,
    source_expense_id: clean(body.source_expense_id, 64) || null, created_by: ctx.session.user.id,
  };
  const response = await fetch(`${base(ctx)}/business_obligations`, {
    method: "POST",
    headers: { ...headers(ctx), Prefer: "return=representation" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save this obligation. Confirm the migration is applied and the source expense reference is valid." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ obligation: Array.isArray(rows) ? rows[0] : null }, { status: 201 });
}
