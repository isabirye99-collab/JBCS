import { NextResponse } from "next/server";
import { getClinicContext } from "@/lib/clinic-context";

export const dynamic = "force-dynamic";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const ctx = await getClinicContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed;
  } catch {
    return NextResponse.json({ error: "Submit valid patient details." }, { status: 400 });
  }

  const fullName = clean(body.full_name, 160).replace(/\s+/g, " ");
  const phone = clean(body.phone, 30);
  const email = clean(body.email, 254).toLowerCase();
  const dob = clean(body.date_of_birth, 10);
  const sex = clean(body.sex, 20);
  const address = clean(body.address, 500);
  const emergencyName = clean(body.emergency_contact_name, 160);
  const emergencyPhone = clean(body.emergency_contact_phone, 30);

  if (fullName.length < 2) return NextResponse.json({ error: "Enter the patient's full name." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (sex && !["female", "male", "other", "undisclosed"].includes(sex)) return NextResponse.json({ error: "Choose a valid sex option." }, { status: 400 });
  if (dob && (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || Number.isNaN(Date.parse(dob)) || new Date(dob + "T00:00:00Z").toISOString().slice(0, 10) !== dob || dob > new Date().toISOString().slice(0, 10))) {
    return NextResponse.json({ error: "Date of birth must be a valid date that is not in the future." }, { status: 400 });
  }

  const headers = {
    apikey: ctx.serviceKey,
    Authorization: `Bearer ${ctx.serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
    const patientNumber = `JPMC-${new Date().getUTCFullYear()}-${random}`;
    const response = await fetch(`${ctx.url}/rest/v1/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspace_id: ctx.workspaceId,
        patient_number: patientNumber,
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        date_of_birth: dob || null,
        sex: sex || null,
        address: address || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
      }),
      cache: "no-store",
    });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows[0]) {
        return NextResponse.json({ patient: { id: rows[0].id, patient_number: rows[0].patient_number, full_name: rows[0].full_name } }, { status: 201 });
      }
      return NextResponse.json({ error: "The patient record could not be confirmed." }, { status: 502 });
    }
    const detail = await response.text().catch(() => "");
    if (response.status === 409 && attempt < 2) continue;
    console.error("Clinic patient registration failed", response.status, detail.slice(0, 250));
    if (response.status === 409) return NextResponse.json({ error: "A patient number collision occurred. Please try again." }, { status: 409 });
    if (response.status === 400) return NextResponse.json({ error: "Some patient details were rejected. Check the information and try again." }, { status: 400 });
    return NextResponse.json({ error: "Patient registration could not be saved. Please try again later." }, { status: 502 });
  }
  return NextResponse.json({ error: "Patient registration could not be saved." }, { status: 500 });
}
