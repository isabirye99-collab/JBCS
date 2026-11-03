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
  } catch { return NextResponse.json({ error: "Submit valid appointment details." }, { status: 400 }); }

  const patientId = clean(body.patient_id, 80);
  const appointmentAt = clean(body.appointment_at, 40);
  const timezoneOffset = Number(body.timezone_offset_minutes);
  const reason = clean(body.reason, 500);
  if (!/^[0-9a-f-]{36}$/i.test(patientId)) return NextResponse.json({ error: "Choose a registered patient." }, { status: 400 });
  const localDateMatch = /^(\\d{4})-(\\d{2})-(\\d{2})T(\\d{2}):(\\d{2})$/.exec(appointmentAt);
  const date = localDateMatch && Number.isInteger(timezoneOffset) && timezoneOffset >= -840 && timezoneOffset <= 840
    ? new Date(Date.UTC(Number(localDateMatch[1]), Number(localDateMatch[2]) - 1, Number(localDateMatch[3]), Number(localDateMatch[4]), Number(localDateMatch[5])) + timezoneOffset * 60_000)
    : new Date(NaN);
  if (!appointmentAt || Number.isNaN(date.getTime())) return NextResponse.json({ error: "Choose a valid appointment date and time." }, { status: 400 });
  if (date.getTime() < Date.now() - 60_000) return NextResponse.json({ error: "Choose a future appointment time." }, { status: 400 });

  const headers = { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" };
  const patientResponse = await fetch(`${ctx.url}/rest/v1/patients?id=eq.${encodeURIComponent(patientId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id&limit=1`, { headers, cache: "no-store" });
  if (!patientResponse.ok) return NextResponse.json({ error: "Patient records could not be verified. Please try again." }, { status: 502 });
  const patientRows = await patientResponse.json();
  if (!Array.isArray(patientRows) || !patientRows.length) return NextResponse.json({ error: "That patient is not registered in this clinic workspace." }, { status: 400 });

  const response = await fetch(`${ctx.url}/rest/v1/clinic_appointments`, {
    method: "POST", headers, cache: "no-store",
    body: JSON.stringify({ workspace_id: ctx.workspaceId, patient_id: patientId, appointment_at: date.toISOString(), reason: reason || null, status: "scheduled", assigned_to: null, notes: null }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Clinic appointment creation failed", response.status, detail.slice(0, 250));
    return NextResponse.json({ error: "The appointment could not be saved. Please try again." }, { status: 502 });
  }
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Appointment could not be confirmed." }, { status: 502 });
  return NextResponse.json({ appointment: { id: rows[0].id, appointment_at: rows[0].appointment_at, status: rows[0].status } }, { status: 201 });
}
