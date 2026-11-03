import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/jbcs_feedback?select=id,name,service,message,status,created_at&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load feedback submissions." }, { status: 502 });
  return NextResponse.json({ feedback: await response.json() });
}

export async function PATCH(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  let body: { id?: string; status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid update." }, { status: 400 }); }
  if (!body.id || !["pending", "approved", "rejected"].includes(body.status || "")) return NextResponse.json({ error: "Choose a valid feedback status." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/jbcs_feedback?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ status: body.status }),
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update feedback status." }, { status: 502 });
  return NextResponse.json({ feedback: await response.json() });
}
