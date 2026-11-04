import { NextResponse } from "next/server";
import { getClinicContext } from "@/lib/clinic-context";

export const dynamic = "force-dynamic";

const str = (v: unknown, n: number) =>
  typeof v === "string" ? v.trim().slice(0, n) : "";

export async function POST(request: Request) {
  const ctx = await getClinicContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value;
  } catch {
    return NextResponse.json({ error: "Submit valid receipt details." }, { status: 400 });
  }

  const patientId = str(body.patient_id, 80);
  const chargeId = str(body.charge_id, 80);
  const amount = Number(body.amount);
  const currency = str(body.currency, 3).toUpperCase();
  const paymentMethod = str(body.payment_method, 30);
  const reference = str(body.transaction_reference, 120);

  if (!/^[0-9a-f-]{36}$/i.test(patientId)) {
    return NextResponse.json({ error: "Select a valid patient." }, { status: 400 });
  }
  if (chargeId && !/^[0-9a-f-]{36}$/i.test(chargeId)) {
    return NextResponse.json({ error: "Select a valid charge." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) {
    return NextResponse.json({ error: "Payment must be greater than zero." }, { status: 400 });
  }
  if (!["UGX", "USD", "KES", "TZS", "EUR", "GBP"].includes(currency)) {
    return NextResponse.json({ error: "Unsupported currency." }, { status: 400 });
  }
  if (!["cash", "mobile_money", "bank_transfer", "card", "other"].includes(paymentMethod)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const headers = {
    apikey: ctx.serviceKey,
    Authorization: `Bearer ${ctx.serviceKey}`,
    "Content-Type": "application/json",
  };
  const receiptNumber =
    "JPMC-R-" +
    new Date().toISOString().slice(0, 10).replaceAll("-", "") +
    "-" +
    crypto.randomUUID().slice(0, 8).toUpperCase();

  let response: Response;
  try {
    response = await fetch(ctx.url + "/rest/v1/rpc/record_clinic_receipt", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({
        p_workspace_id: ctx.workspaceId,
        p_patient_id: patientId,
        p_charge_id: chargeId || null,
        p_receipt_number: receiptNumber,
        p_amount: amount,
        p_currency: currency,
        p_payment_method: paymentMethod,
        p_transaction_reference: reference || null,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Payment service is temporarily unavailable. Please try again." }, { status: 502 });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.message === "string" ? payload.message : "";
    const safeMessages = [
      "Patient not found in this clinic.",
      "Charge not found for this patient.",
      "This charge is not open for payment.",
      "Payment currency must match the charge.",
      "Payment exceeds remaining balance",
      "Payment must be greater than zero.",
      "Unsupported currency.",
      "Invalid payment method.",
    ];
    const safeMessage = safeMessages.find((item) => message.startsWith(item));
    const clientError = response.status === 400 || response.status === 404 ||
      ["22023", "P0001", "P0002"].includes(String(payload?.code || ""));
    return NextResponse.json(
      { error: clientError && safeMessage ? message : "Could not record payment. No receipt was confirmed; please check before retrying." },
      { status: clientError ? 400 : 502 },
    );
  }

  const receipt = Array.isArray(payload) ? payload[0] : null;
  if (!receipt?.receipt_number) {
    return NextResponse.json({ error: "Payment response could not be confirmed. Check the receipt list before retrying." }, { status: 502 });
  }

  return NextResponse.json({
    receipt: {
      receipt_number: receipt.receipt_number,
      amount: receipt.amount,
      currency: String(receipt.currency).trim(),
      payment_method: receipt.payment_method,
      receipt_date: receipt.receipt_date,
      patient_id: receipt.patient_id,
      charge_id: receipt.charge_id,
    },
  }, { status: 201 });
}
