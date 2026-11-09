import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const fields = "id,workspace_id,product_key,company_name,legal_name,logo_url,address,phone,email,website,registration_number,tax_number,primary_color,secondary_color,font_family,template_style,logo_position,footer_text,template_options,bank_name,bank_account_name,bank_account_number,bank_branch,bank_currency,bank_swift_code,payment_instructions,updated_at";
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(`${ctx.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&product_key=eq.billing&select=${fields}&limit=1`, { headers: headers(ctx.serviceKey), cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Could not load business settings." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ workspace: { id: ctx.workspaceId, name: ctx.workspaceName, role: ctx.role }, settings: Array.isArray(rows) ? rows[0] ?? null : null });
}

export async function PUT(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!["owner", "admin"].includes(ctx.role)) return NextResponse.json({ error: "Only workspace owners or admins can change business settings." }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid settings." }, { status: 400 }); }

  const companyName = clean(body.company_name, 200);
  if (!companyName) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  const email = clean(body.email, 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid business email address." }, { status: 400 });
  const primaryColor = clean(body.primary_color || "#9F1D35", 7);
  const secondaryColor = clean(body.secondary_color || "#F3192D", 7);
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor) || !/^#[0-9a-fA-F]{6}$/.test(secondaryColor)) return NextResponse.json({ error: "Choose valid six-digit hex colours." }, { status: 400 });
  const templateStyle = clean(body.template_style || "modern", 20);
  const logoPosition = clean(body.logo_position || "left", 20);
  if (!["modern", "classic", "minimal", "formal"].includes(templateStyle) || !["left", "center", "right"].includes(logoPosition)) return NextResponse.json({ error: "Choose a supported document style and logo position." }, { status: 400 });
  const templateOptions = body.template_options && typeof body.template_options === "object" && !Array.isArray(body.template_options) ? body.template_options : {};

  const payload = {
    workspace_id: ctx.workspaceId,
    product_key: "billing",
    company_name: companyName,
    legal_name: clean(body.legal_name, 200) || null,
    logo_url: clean(body.logo_url, 1000) || null,
    address: clean(body.address, 1000) || null,
    phone: clean(body.phone, 100) || null,
    email: email || null,
    website: clean(body.website, 300) || null,
    registration_number: clean(body.registration_number, 120) || null,
    tax_number: clean(body.tax_number, 120) || null,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    font_family: clean(body.font_family || "Inter", 60),
    template_style: templateStyle,
    logo_position: logoPosition,
    footer_text: clean(body.footer_text, 1000) || null,
    template_options: templateOptions,
    bank_name: clean(body.bank_name, 200) || null,
    bank_account_name: clean(body.bank_account_name, 200) || null,
    bank_account_number: clean(body.bank_account_number, 100) || null,
    bank_branch: clean(body.bank_branch, 200) || null,
    bank_currency: clean(body.bank_currency || "UGX", 3).toUpperCase(),
    bank_swift_code: clean(body.bank_swift_code, 30) || null,
    payment_instructions: clean(body.payment_instructions, 2000) || null,
    updated_by: ctx.session.user.id,
    updated_at: new Date().toISOString(),
  };
  if (!/^[A-Z]{3}$/.test(payload.bank_currency)) return NextResponse.json({ error: "Enter a valid three-letter bank currency." }, { status: 400 });

  const response = await fetch(`${ctx.url}/rest/v1/workspace_document_branding?on_conflict=workspace_id,product_key`, {
    method: "POST",
    headers: { ...headers(ctx.serviceKey), "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not save business settings. Please check the fields and try again." }, { status: 502 });
  const rows = await response.json();
  return NextResponse.json({ settings: Array.isArray(rows) ? rows[0] ?? payload : payload, success: true });
}
