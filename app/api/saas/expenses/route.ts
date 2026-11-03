import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(`${ctx.url}/rest/v1/expenses?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,expense_date,category,description,amount,currency,payment_method,notes,created_at&order=expense_date.desc&limit=200`, {
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load expenses." }, { status: 502 });
  return NextResponse.json({ expenses: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid expense details." }, { status: 400 }); }
  const category = clean(body.category, 100);
  const description = clean(body.description, 500);
  const expenseDate = clean(body.expense_date, 10) || new Date().toISOString().slice(0, 10);
  const currency = clean(body.currency || "UGX", 3).toUpperCase();
  const amount = Number(body.amount);
  const paymentMethod = clean(body.payment_method || "other", 30);
  const notes = clean(body.notes, 2000);
  if (!category || !description || !dateOk(expenseDate)) return NextResponse.json({ error: "Enter a category, description and valid date." }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) return NextResponse.json({ error: "Enter a valid expense amount." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Use a valid three-letter currency." }, { status: 400 });
  if (!["cash","bank_transfer","mobile_money","card","cheque","other"].includes(paymentMethod)) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
  const response = await fetch(`${ctx.url}/rest/v1/expenses`, {
    method: "POST",
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: ctx.workspaceId, expense_date: expenseDate, category, description, amount, currency, payment_method: paymentMethod, notes: notes || null, recorded_by: ctx.session.user.id }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save the expense." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ expense: Array.isArray(rows) ? rows[0] : null }, { status: 201 });
}
