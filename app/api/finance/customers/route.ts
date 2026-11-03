import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function config() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getWorkspaceId(url: string, key: string): Promise<string | null> {
  const response = await fetch(
    `${url}/rest/v1/business_workspaces?slug=eq.jbcs&is_active=eq.true&select=id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1 ? rows[0].id : null;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ error: "Finance database configuration is missing." }, { status: 503 });
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) {
      return NextResponse.json({ error: "JBCS workspace not found or inactive." }, { status: 503 });
    }

    const requestedType = request.nextUrl.searchParams.get("type") || "client";
    const contactType = ["client", "supplier", "other"].includes(requestedType)
      ? requestedType
      : "client";

    const response = await fetch(
      `${url}/rest/v1/business_contacts?workspace_id=eq.${encodeURIComponent(workspaceId)}&contact_type=eq.${contactType}&select=id,name,email,phone,address,tax_number,notes,created_at,updated_at&order=name.asc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load finance customers." }, { status: 502 });
    }

    return NextResponse.json({ customers: await response.json() });
  } catch {
    return NextResponse.json({ error: "Unable to connect to the finance database." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json({ error: "Finance database configuration is missing." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid customer details." }, { status: 400 });
  }

  const field = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const contactType = body.contact_type === "supplier" ? "supplier" : "client";
  const name = field(body.name, 160);
  const email = field(body.email, 254);
  const phone = field(body.phone, 40);
  const address = field(body.address, 500);
  const tax_number = field(body.tax_number, 100);
  const notes = field(body.notes, 2000);

  if (!name) {
    return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) {
      return NextResponse.json({ error: "JBCS workspace not found or inactive." }, { status: 503 });
    }

    const response = await fetch(`${url}/rest/v1/business_contacts`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        contact_type: contactType,
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        tax_number: tax_number || null,
        notes: notes || null,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not save the contact." }, { status: 502 });
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || !rows[0]) {
      return NextResponse.json({ error: "The contact was not returned after saving." }, { status: 502 });
    }

    return NextResponse.json({ customer: rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to connect to the finance database." }, { status: 502 });
  }
}
