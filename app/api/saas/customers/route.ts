import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(`${ctx.url}/rest/v1/business_contacts?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&contact_type=eq.client&select=id,name,email,phone,address,tax_number,created_at&order=name.asc&limit=500`, {
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load customers." }, { status: 502 });
  return NextResponse.json({ customers: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid customer details." }, { status: 400 }); }
  const field = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const name = field(body.name, 160);
  const email = field(body.email, 254).toLowerCase();
  const phone = field(body.phone, 40);
  const address = field(body.address, 500);
  const taxNumber = field(body.tax_number, 100);
  if (name.length < 2) return NextResponse.json({ error: "Customer name must contain at least two characters." }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const response = await fetch(`${ctx.url}/rest/v1/business_contacts`, {
    method: "POST",
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: ctx.workspaceId, contact_type: "client", name, email: email || null, phone: phone || null, address: address || null, tax_number: taxNumber || null }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save the customer." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ customer: Array.isArray(rows) ? rows[0] : null }, { status: 201 });
}
