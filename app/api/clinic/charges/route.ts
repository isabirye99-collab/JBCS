import { NextResponse } from "next/server";
import { getClinicContext } from "@/lib/clinic-context";

export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const ctx = await getClinicContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed;
  } catch { return NextResponse.json({ error: "Submit valid charge details." }, { status: 400 }); }

  const patientId = clean(body.patient_id, 80);
  const description = clean(body.description, 240);
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unit_price);
  const currency = clean(body.currency, 3).toUpperCase();
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return NextResponse.json({ error: "Choose a registered patient." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Enter a description for this charge." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100000) return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
  if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1_000_000_000_000) return NextResponse.json({ error: "Enter a valid non-negative unit price." }, { status: 400 });
  if (!["UGX","USD","KES","TZS","EUR","GBP"].includes(currency)) return NextResponse.json({ error: "Choose a supported currency." }, { status: 400 });

  const headers = { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const verify = await fetch(`${ctx.url}/rest/v1/patients?id=eq.${encodeURIComponent(patientId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id&limit=1`, { headers, cache: "no-store" });
  if (!verify.ok) return NextResponse.json({ error: "Patient records could not be verified. Please try again." }, { status: 502 });
  const found = await verify.json();
  if (!Array.isArray(found) || !found.length) return NextResponse.json({ error: "That patient is not registered in this clinic workspace." }, { status: 400 });

  const response = await fetch(`${ctx.url}/rest/v1/clinic_charges`, { method: "POST", headers, cache: "no-store", body: JSON.stringify({ workspace_id: ctx.workspaceId, patient_id: patientId, description, quantity, unit_price: unitPrice, currency, status: "unpaid" }) });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Clinic charge creation failed", response.status, detail.slice(0, 250));
    return NextResponse.json({ error: "The charge could not be saved. Please try again." }, { status: 502 });
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Charge could not be confirmed." }, { status: 502 });
  return NextResponse.json({ charge: { id: rows[0].id, description: rows[0].description, quantity: rows[0].quantity, unit_price: rows[0].unit_price, currency: rows[0].currency, status: rows[0].status } }, { status: 201 });
}
