import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const headers = (ctx: { serviceKey: string }) => ({
  apikey: ctx.serviceKey,
  Authorization: `Bearer ${ctx.serviceKey}`,
  "Content-Type": "application/json",
});
const base = (ctx: { url: string }) => `${ctx.url}/rest/v1`;

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Select a valid expense to reconcile." }, { status: 400 }); }

  const expenseId = typeof body.expense_id === "string" ? body.expense_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(expenseId)) {
    return NextResponse.json({ error: "Select a valid expense." }, { status: 400 });
  }
  const h = headers(ctx);
  const root = base(ctx);
  const expenseResponse = await fetch(`${root}/expenses?id=eq.${encodeURIComponent(expenseId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,expense_date,category,description,supplier_contact_id,amount,currency,notes&limit=1`, { headers: h, cache: "no-store" });
  if (!expenseResponse.ok) return NextResponse.json({ error: "Unable to verify this expense." }, { status: 502 });
  const expenses = await expenseResponse.json() as Array<{id:string;expense_date:string;category:string;description:string;supplier_contact_id?:string|null;amount:number|string;currency:string;notes?:string|null}>;
  const expense = expenses[0];
  if (!expense) return NextResponse.json({ error: "Expense not found in this workspace." }, { status: 404 });
  const existingResponse = await fetch(`${root}/business_obligations?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&source_expense_id=eq.${encodeURIComponent(expense.id)}&select=id,lender_name,outstanding_amount&limit=1`, { headers: h, cache: "no-store" });
  if (!existingResponse.ok) return NextResponse.json({ error: "Unable to check whether this expense was already reconciled. Confirm the migration is applied." }, { status: 502 });
  const existing = await existingResponse.json() as Array<{id:string;lender_name:string;outstanding_amount:number|string}>;
  if (existing.length) return NextResponse.json({ error: "This expense is already linked to a Money Owed record.", obligation: existing[0] }, { status: 409 });

  let lenderName = "Payee not specified";
  let lenderType = "other";
  if (expense.supplier_contact_id) {
    const supplierResponse = await fetch(`${root}/business_contacts?id=eq.${encodeURIComponent(expense.supplier_contact_id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,name,contact_type&limit=1`, { headers: h, cache: "no-store" });
    if (supplierResponse.ok) {
      const suppliers = await supplierResponse.json() as Array<{id:string;name:string;contact_type?:string}>;
      if (suppliers[0]) { lenderName = suppliers[0].name; lenderType = "supplier"; }
    }
  }
  const originalAmount = Number(expense.amount);
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) return NextResponse.json({ error: "This expense has an invalid amount and cannot be reconciled." }, { status: 400 });
  const dueDate = typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date) ? body.due_date : null;
  const description = `${expense.category}: ${expense.description}`.slice(0, 500);
  const payload = {
    workspace_id: ctx.workspaceId,
    obligation_type: "payable",
    lender_type: lenderType,
    lender_name: lenderName,
    description,
    currency: (expense.currency || "UGX").toUpperCase(),
    original_amount: originalAmount,
    outstanding_amount: originalAmount,
    interest_type: "unspecified",
    received_or_incurred_date: expense.expense_date,
    due_date: dueDate,
    repayment_frequency: "flexible",
    status: dueDate && dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : "open",
    source_expense_id: expense.id,
    notes: [`Created from existing expense ${expense.id} for review. Confirm that this amount remains unpaid before treating it as a liability.`, expense.notes].filter(Boolean).join("\n"),
    created_by: ctx.session.user.id,
  };
  const insert = await fetch(`${root}/business_obligations`, {
    method: "POST",
    headers: { ...h, Prefer: "return=representation" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!insert.ok) {
    const detail = await insert.text().catch(() => "");
    if (detail.includes("business_obligations_workspace_source_expense_uidx")) return NextResponse.json({ error: "This expense has already been reconciled." }, { status: 409 });
    return NextResponse.json({ error: "Could not create the Money Owed review record. Confirm the migration has been applied." }, { status: 502 });
  }
  const rows = await insert.json();
  return NextResponse.json({ obligation: Array.isArray(rows) ? rows[0] : null, review_required: true }, { status: 201 });
}
