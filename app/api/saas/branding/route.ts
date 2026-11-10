import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const PRODUCTS = new Set(["billing", "clinic"]);
const DEFAULTS = {
  company_name: "",
  legal_name: "",
  logo_url: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  registration_number: "",
  tax_number: "",
  primary_color: "#9f1d35",
  secondary_color: "#d97736",
  font_family: "Arial",
  template_style: "modern",
  logo_position: "left",
  footer_text: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  bank_branch: "",
  bank_currency: "UGX",
  bank_swift_code: "",
  payment_instructions: "",
  template_options: {},
};

function productKey(request: NextRequest) {
  const value = (request.nextUrl.searchParams.get("product") || "billing").toLowerCase();
  return PRODUCTS.has(value) ? value : null;
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validLogoUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return value.startsWith("/");
  }
}

export async function GET(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const product = productKey(request);
  if (!product) return NextResponse.json({ error: "Choose Billing or Clinic branding." }, { status: 400 });

  const response = await fetch(
    `${ctx.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&product_key=eq.${product}&select=*&limit=1`,
    { headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store" },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not load document branding. Confirm the branding migration has been applied." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({
    branding: { ...DEFAULTS, company_name: ctx.workspaceName, ...(Array.isArray(rows) && rows[0] ? rows[0] : {}), product_key: product },
    role: ctx.role,
  });
}

export async function PUT(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!["owner", "admin"].includes(ctx.role)) {
    return NextResponse.json({ error: "Only workspace owners and administrators can change document branding." }, { status: 403 });
  }
  const product = productKey(request);
  if (!product) return NextResponse.json({ error: "Choose Billing or Clinic branding." }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    body = value;
  } catch {
    return NextResponse.json({ error: "Submit valid branding settings." }, { status: 400 });
  }

  const primary = clean(body.primary_color, 7);
  const secondary = clean(body.secondary_color, 7);
  const font = clean(body.font_family, 40);
  const style = clean(body.template_style, 20);
  const logoPosition = clean(body.logo_position, 10);
  const logoUrl = clean(body.logo_url, 1000);
  if (!/^#[0-9a-f]{6}$/i.test(primary) || !/^#[0-9a-f]{6}$/i.test(secondary)) {
    return NextResponse.json({ error: "Choose valid six-digit hex colours." }, { status: 400 });
  }
  if (!["Arial", "Inter", "Georgia", "Verdana", "Tahoma"].includes(font)) {
    return NextResponse.json({ error: "Choose a supported font." }, { status: 400 });
  }
  if (!["modern", "classic", "minimal", "formal"].includes(style) || !["left", "center", "right"].includes(logoPosition)) {
    return NextResponse.json({ error: "Choose a valid template style and logo position." }, { status: 400 });
  }
  if (!validLogoUrl(logoUrl)) {
    return NextResponse.json({ error: "Logo URL must be a valid HTTP(S) or site-relative URL." }, { status: 400 });
  }

  const payload = {
    workspace_id: ctx.workspaceId,
    product_key: product,
    company_name: clean(body.company_name, 160) || ctx.workspaceName,
    legal_name: clean(body.legal_name, 160) || null,
    logo_url: logoUrl || null,
    address: clean(body.address, 500) || null,
    phone: clean(body.phone, 80) || null,
    email: clean(body.email, 254) || null,
    website: clean(body.website, 200) || null,
    registration_number: clean(body.registration_number, 100) || null,
    tax_number: clean(body.tax_number, 100) || null,
    bank_name: clean(body.bank_name, 160) || null,
    bank_account_name: clean(body.bank_account_name, 160) || null,
    bank_account_number: clean(body.bank_account_number, 100) || null,
    bank_branch: clean(body.bank_branch, 160) || null,
    bank_currency: clean(body.bank_currency, 3) || "UGX",
    bank_swift_code: clean(body.bank_swift_code, 20) || null,
    payment_instructions: clean(body.payment_instructions, 1000) || null,
    primary_color: primary,
    secondary_color: secondary,
    font_family: font,
    template_style: style,
    logo_position: logoPosition,
    footer_text: clean(body.footer_text, 1000) || null,
    template_options: body.template_options && typeof body.template_options === "object" && !Array.isArray(body.template_options) ? body.template_options : {},
    updated_by: ctx.session.user.id,
    updated_at: new Date().toISOString(),
  };
  const response = await fetch(
    `${ctx.url}/rest/v1/workspace_document_branding?on_conflict=workspace_id,product_key`,
    {
      method: "POST",
      headers: {
        apikey: ctx.serviceKey,
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  if (!response.ok) return NextResponse.json({ error: "Could not save branding settings." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ branding: Array.isArray(rows) ? rows[0] : payload });
}
