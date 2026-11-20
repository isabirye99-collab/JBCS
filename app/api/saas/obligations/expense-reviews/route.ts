import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const headers = (ctx: { serviceKey: string }) => ({
  apikey: ctx.serviceKey,
  Authorization: `Bearer ${ctx.serviceKey}`,
  "Content-Type": "application/json",
});
const base = (ctx: { url: string }) => `${ctx.url}/rest/v1`;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const classifications = ["already_paid", "ordinary_expense", "loan_repayment"] as const;

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(
    `${base(ctx)}/business_expense_reviews?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,expense_id,classification,notes,reviewed_by,reviewed_at&order=reviewed_at.desc&limit=2000`,
    { headers: headers(ctx), cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Unable to load expense review decisions. Confirm the Money Owed migration has been applied." }, { status: 502 });
  return NextResponse.json({ reviews: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Select an expense and a review decision." }, { status: 400 }); }

  const expenseId = typeof body.expense_id === "string" ? body.expense_id : "";
  const classification = typeof body.classification === "string" ? body.classification : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : "";
  if (!uuid.test(expenseId) || !classifications.includes(classification as typeof classifications[number])) {
    return NextResponse.json({ error: "Select a valid expense review decision." }, { status: 400 });
  }

  const h = headers(ctx);
  const expenseCheck = await fetch(
    `${base(ctx)}/expenses?id=eq.${encodeURIComponent(expenseId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id&limit=1`,
    { headers: h, cache: "no-store" },
  );
  if (!expenseCheck.ok) return NextResponse.json({ error: "Unable to verify this expense." }, { status: 502 });
  const expenses = await expenseCheck.json() as Array<{ id: string }>;
  if (!expenses.length) return NextResponse.json({ error: "Expense not found in this workspace." }, { status: 404 });

  const response = await fetch(
    `${base(ctx)}/business_expense_reviews?on_conflict=workspace_id,expense_id`,
    {
      method: "POST",
      headers: { ...h, Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        workspace_id: ctx.workspaceId,
        expense_id: expenseId,
        classification,
        notes: notes || null,
        reviewed_by: ctx.session.user.id,
        reviewed_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not save the review decision. Confirm the Money Owed migration has been applied." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ review: Array.isArray(rows) ? rows[0] : null }, { status: 200 });
}


export async function DELETE(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const expenseId = request.nextUrl.searchParams.get("expense_id") || "";
  if (!uuid.test(expenseId)) return NextResponse.json({ error: "Select a valid expense review." }, { status: 400 });
  const response = await fetch(
    `${base(ctx)}/business_expense_reviews?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&expense_id=eq.${encodeURIComponent(expenseId)}`,
    { method: "DELETE", headers: { ...headers(ctx), Prefer: "return=minimal" }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not reopen this expense review." }, { status: 502 });
  return NextResponse.json({ success: true });
}
