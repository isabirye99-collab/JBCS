
import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSaasContext();

  if ("error" in ctx) {
    return NextResponse.json(
      { error: ctx.error },
      { status: ctx.status }
    );
  }

  const url = new URL(
    `${ctx.url}/rest/v1/business_contacts`
  );

  url.searchParams.set("workspace_id", `eq.${ctx.workspaceId}`);
  url.searchParams.set("contact_type", "eq.client");
  url.searchParams.set(
    "select",
    "id,name,email,phone,address,tax_number,created_at,is_supplier"
  );
  url.searchParams.set("order", "name.asc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to load customers." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    customers: await response.json(),
  });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();

  if ("error" in ctx) {
    return NextResponse.json(
      { error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter valid customer details." },
      { status: 400 }
    );
  }

  const field = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const name = field(body.name, 160);
  const email = field(body.email, 254).toLowerCase();
  const phone = field(body.phone, 40);
  const address = field(body.address, 500);
  const taxNumber = field(body.tax_number, 100);
  const isSupplier = body.is_supplier === true;

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Customer name must contain at least two characters." },
      { status: 400 }
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const response = await fetch(
    `${ctx.url}/rest/v1/business_contacts`,
    {
      method: "POST",
      headers: {
        apikey: ctx.serviceKey,
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        workspace_id: ctx.workspaceId,
        contact_type: "client",
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        tax_number: taxNumber || null,
        is_supplier: isSupplier,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Could not save the customer." },
      { status: 502 }
    );
  }

  const rows = await response.json();

  return NextResponse.json(
    { customer: Array.isArray(rows) ? rows[0] : null },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();

  if ("error" in ctx) {
    return NextResponse.json(
      { error: ctx.error },
      { status: ctx.status }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Enter valid customer details." },
      { status: 400 }
    );
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const field = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const hasSupplierStatus = typeof body.is_supplier === "boolean";
  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");
  const hasPhone = Object.prototype.hasOwnProperty.call(body, "phone");
  const hasAddress = Object.prototype.hasOwnProperty.call(body, "address");
  const hasTaxNumber = Object.prototype.hasOwnProperty.call(body, "tax_number");
  const hasProfileFields = hasName || hasEmail || hasPhone || hasAddress || hasTaxNumber;
  const name = field(body.name, 160);
  const email = field(body.email, 254).toLowerCase();
  const phone = field(body.phone, 40);
  const address = field(body.address, 500);
  const taxNumber = field(body.tax_number, 100);

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    (!hasSupplierStatus && !hasProfileFields) ||
    (hasName && name.length < 2) ||
    (hasEmail && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return NextResponse.json(
      { error: "Enter a valid customer ID and customer details." },
      { status: 400 }
    );
  }

  const url = new URL(`${ctx.url}/rest/v1/business_contacts`);
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("workspace_id", `eq.${ctx.workspaceId}`);
  url.searchParams.set("contact_type", "eq.client");
  url.searchParams.set("select", "id,name,email,phone,address,tax_number,created_at,is_supplier");

  const update: Record<string, unknown> = {};
  if (hasSupplierStatus) update.is_supplier = body.is_supplier;
  if (hasName) update.name = name;
  if (hasEmail) update.email = email || null;
  if (hasPhone) update.phone = phone || null;
  if (hasAddress) update.address = address || null;
  if (hasTaxNumber) update.tax_number = taxNumber || null;

  const response = await fetch(url.toString(), {
    method: "PATCH",
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(update),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Could not update the customer's supplier status." },
      { status: 502 }
    );
  }

  const rows = await response.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "Customer not found in this workspace." },
      { status: 404 }
    );
  }

  return NextResponse.json({ customer: rows[0] });
}
