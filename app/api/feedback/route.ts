import { NextRequest, NextResponse } from "next/server";

const base = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  if (!base || !key) return NextResponse.json({ feedback: [] });
  const response = await fetch(`${base}/rest/v1/jbcs_feedback?select=id,name,service,message,created_at&status=eq.approved&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store"
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load feedback." }, { status: 502 });
  return NextResponse.json({ feedback: await response.json() });
}

export async function POST(request: NextRequest) {
  if (!base || !key) return NextResponse.json({ error: "Feedback submission is not configured yet. Please contact us on WhatsApp." }, { status: 503 });
  let body: { name?: string; service?: string; message?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Please check the information and try again." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const service = typeof body.service === "string" ? body.service.trim().slice(0, 100) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1500) : "";
  if (!service || message.length < 10) return NextResponse.json({ error: "Please choose a service and write at least 10 characters of feedback." }, { status: 400 });
  const response = await fetch(`${base}/rest/v1/jbcs_feedback`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ name: name || null, service, message, status: "pending" })
  });
  if (!response.ok) return NextResponse.json({ error: "We couldn't save your feedback right now. Please try again later." }, { status: 502 });
  return NextResponse.json({ success: true }, { status: 201 });
}
