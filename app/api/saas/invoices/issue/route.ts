import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function POST(request: import("next/server").NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Choose an invoice to issue." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
  }

  const headers = { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` };
  const url = `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,status,total&limit=1`;
  const existing = await fetch(url, { headers, cache: "no-store" });
  if (!existing.ok) return NextResponse.json({ error: "Unable to verify invoice." }, { status: 502 });
  const rows = await existing.json();
  if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Invoice not found in this workspace." }, { status: 404 });
  if (rows[0].status !== "draft") return NextResponse.json({ error: "Only draft invoices can be issued." }, { status: 409 });
  if (!Number.isFinite(Number(rows[0].total)) || Number(rows[0].total) <= 0) {
    return NextResponse.json({ error: "Add a positive invoice total before issuing this invoice." }, { status: 400 });
  }

  // Capture the branding at the moment the invoice is issued so later
  // workspace design changes cannot rewrite this historical document.
  const brandingResponse = await fetch(
    `${ctx.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&product_key=eq.billing&select=company_name,legal_name,logo_url,address,phone,email,website,registration_number,tax_number,primary_color,secondary_color,font_family,template_style,logo_position,footer_text,template_options&limit=1`,
    { headers, cache: "no-store" },
  );
  if (!brandingResponse.ok) {
    return NextResponse.json({ error: "Document branding is not ready. Apply the workspace branding migration before issuing invoices." }, { status: 503 });
  }
  const brandingRows = await brandingResponse.json();
  const brandingSnapshot = Array.isArray(brandingRows) && brandingRows[0]
    ? brandingRows[0]
    : {
        company_name: ctx.workspaceName,
        primary_color: "#9f1d35",
        secondary_color: "#d97736",
        font_family: "Arial",
        template_style: "modern",
        logo_position: "left",
        footer_text: "Thank you for your business.",
      };

  const issued = await fetch(
    `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&status=eq.draft&total=gt.0`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ status: "sent", branding_snapshot: brandingSnapshot, updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!issued.ok) return NextResponse.json({ error: "Could not issue invoice." }, { status: 502 });
  const updated = await issued.json();
  if (!Array.isArray(updated) || !updated[0]) {
    return NextResponse.json({ error: "Invoice changed before it could be issued. Reload and try again." }, { status: 409 });
  }
  return NextResponse.json({ invoice: updated[0] });
}
