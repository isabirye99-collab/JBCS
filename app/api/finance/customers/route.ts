import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

const config = () => ({ url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY });

async function workspaceId(url: string, key: string) {
  const response = await fetch(`${url}/rest/v1/business_workspaces?select=id&slug=eq.jbcs&is_active=eq.true&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows[0]?.id as string | undefined;
}

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  const workspace = await workspaceId(url, key);
  if (!workspace) return NextResponse.json({ error: "JBCS workspace was not found." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/business_contacts?select=id,name,email,phone,address,tax_number,notes,created_at&workspace_id=eq.${encodeURIComponent(workspace)}&contact_type=eq.client&order=created_at.desc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load customers." }, { status: 502 });
  return NextResponse.json({ customers: await response.json() });
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid customer details." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 160) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : "";
  const address = typeof body.address === "string" ? body.address.trim().slice(0, 500) : "";
  const tax_number = typeof body.tax_number === "string" ? body.tax_number.trim().slice(0, 100) : "";
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
  if (!name) return NextResponse.json({ error: "Customer or organisation name is required." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const workspace = await workspaceId(url, key);
  if (!workspace) return NextResponse.json({ error: "JBCS workspace was not found." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/business_contacts`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: workspace, contact_type: "client", name, email: email || null, phone: phone || null, address: address || null, tax_number: tax_number || null, notes: notes || null }),
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save the customer. Please try again." }, { status: 502 });
  return NextResponse.json({ customer: (await response.json())[0] }, { status: 201 });
}
