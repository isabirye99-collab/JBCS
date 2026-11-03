import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

function config() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

export async function GET() {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/jbcs_clients?select=id,name,logo_url,website_url,description,is_published,sort_order,created_at&order=sort_order.asc,name.asc`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load clients." }, { status: 502 });
  return NextResponse.json({ clients: await response.json() });
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid client details." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const logo_url = typeof body.logo_url === "string" ? body.logo_url.trim().slice(0, 1000) : "";
  const website_url = typeof body.website_url === "string" ? body.website_url.trim().slice(0, 1000) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 500) : "";
  if (!name || !logo_url || !/^https?:\/\//i.test(logo_url) || (website_url && !/^https?:\/\//i.test(website_url))) {
    return NextResponse.json({ error: "Enter a client name, a valid logo URL, and an optional website URL beginning with https://." }, { status: 400 });
  }
  const response = await fetch(`${url}/rest/v1/jbcs_clients`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ name, logo_url, website_url: website_url || null, description: description || null, is_published: body.is_published === true, sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0 }),
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save this client." }, { status: 502 });
  return NextResponse.json({ client: (await response.json())[0] }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  let body: { id?: string; is_published?: boolean; sort_order?: number; name?: string; logo_url?: string; website_url?: string | null; description?: string | null };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid update." }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  const update: Record<string, unknown> = {};
  if (typeof body.is_published === "boolean") update.is_published = body.is_published;
  if (typeof body.sort_order === "number") update.sort_order = body.sort_order;
  if (typeof body.name === "string") update.name = body.name.trim().slice(0, 120);
  if (typeof body.logo_url === "string" && /^https?:\/\//i.test(body.logo_url)) update.logo_url = body.logo_url.trim();
  if (typeof body.website_url === "string" || body.website_url === null) update.website_url = body.website_url;
  if (typeof body.description === "string" || body.description === null) update.description = body.description;
  if (!Object.keys(update).length) return NextResponse.json({ error: "No valid changes supplied." }, { status: 400 });
  update.updated_at = new Date().toISOString();
  const response = await fetch(`${url}/rest/v1/jbcs_clients?id=eq.${encodeURIComponent(body.id)}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(update),
  });
  if (!response.ok) return NextResponse.json({ error: "Could not update this client." }, { status: 502 });
  return NextResponse.json({ clients: await response.json() });
}

export async function DELETE(request: NextRequest) {
  if (!await verifyAdmin()) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Database connection is not configured." }, { status: 503 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Client ID is required." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/jbcs_clients?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not delete this client." }, { status: 502 });
  return NextResponse.json({ success: true });
}
