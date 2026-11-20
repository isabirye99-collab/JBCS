import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const obligationId = request.nextUrl.searchParams.get("obligation_id") || "";
  if (obligationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(obligationId)) {
    return NextResponse.json({ error: "Select a valid money-owed record." }, { status: 400 });
  }
  const filters = obligationId ? `&obligation_id=eq.${encodeURIComponent(obligationId)}` : "";
  const response = await fetch(`${ctx.url}/rest/v1/business_obligation_payments?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}${filters}&select=id,obligation_id,payment_date,amount,currency,payment_method,payment_reference,principal_amount,interest_amount,notes&order=payment_date.desc,created_at.desc&limit=2000`, {
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load repayment history. Confirm the database migration has been applied." }, { status: 502 });
  return NextResponse.json({ payments: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Enter valid payment details." }, { status: 400 }); }

  const obligationId = typeof body.obligation_id === "string" ? body.obligation_id : "";
  const paymentDate = typeof body.payment_date === "string" ? body.payment_date : "";
  const amount = Number(body.amount);
  const interestAmount = body.interest_amount === "" || body.interest_amount == null ? 0 : Number(body.interest_amount);
  const principalAmount = body.principal_amount === "" || body.principal_amount == null ? amount - interestAmount : Number(body.principal_amount);
  const paymentMethod = typeof body.payment_method === "string" ? body.payment_method.trim().slice(0, 40) : "other";
  const paymentReference = typeof body.payment_reference === "string" ? body.payment_reference.trim().slice(0, 160) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(obligationId)) {
    return NextResponse.json({ error: "Select a valid money-owed record." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate) || Number.isNaN(Date.parse(paymentDate))) {
    return NextResponse.json({ error: "Enter a valid payment date." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(interestAmount) || interestAmount < 0 ||
      !Number.isFinite(principalAmount) || principalAmount < 0 ||
      Math.abs(principalAmount + interestAmount - amount) > 0.01) {
    return NextResponse.json({ error: "Payment amount must equal principal plus interest. Check the amounts entered." }, { status: 400 });
  }

  const response = await fetch(`${ctx.url}/rest/v1/rpc/record_business_obligation_payment`, {
    method: "POST",
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_obligation_id: obligationId,
      p_payment_date: paymentDate,
      p_amount: amount,
      p_principal_amount: principalAmount,
      p_interest_amount: interestAmount,
      p_payment_method: paymentMethod || "other",
      p_payment_reference: paymentReference || null,
      p_notes: notes || null,
      p_recorded_by: ctx.session.user.id,
    }),
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof result?.message === "string" ? result.message : "";
    const known = [
      "Obligation not found in this workspace.",
      "Principal payment cannot exceed the outstanding balance.",
      "This obligation is already settled or written off.",
      "Payment amount must equal principal plus interest.",
    ];
    const error = known.find(message => detail.includes(message));
    return NextResponse.json({ error: error || "Could not record the repayment. Confirm the database migration has been applied." }, { status: error ? 400 : 502 });
  }
  return NextResponse.json(result, { status: 201 });
}
