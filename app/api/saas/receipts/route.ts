import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });
  const r = await fetch(
    `${c.url}/rest/v1/sales_receipts?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=*,business_contacts(name)&order=receipt_date.desc&limit=500`,
    { headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` }, cache: "no-store" },
  );
  if (!r.ok) return NextResponse.json({ error: "Could not load sales receipts." }, { status: 502 });
  return NextResponse.json({ receipts: await r.json() });
}

export async function POST(req: NextRequest) {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });
  let b: Record<string, unknown>;
  try {
    const value = await req.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    b = value;
  } catch {
    return NextResponse.json({ error: "Invalid receipt." }, { status: 400 });
  }

  const amount = Number(b.amount);
  const currency = String(b.currency || "UGX").toUpperCase();
  const method = String(b.payment_method || "");
  if (!Number.isFinite(amount) || amount <= 0 || !/^[A-Z]{3}$/.test(currency) ||
      !["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"].includes(method)) {
    return NextResponse.json({ error: "Enter a valid amount, currency and payment method." }, { status: 400 });
  }

  const headers = { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` };
  const brandingResponse = await fetch(
    `${c.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&product_key=eq.billing&select=company_name,legal_name,logo_url,address,phone,email,website,registration_number,tax_number,primary_color,secondary_color,font_family,template_style,logo_position,footer_text,template_options&limit=1`,
    { headers, cache: "no-store" },
  );
  if (!brandingResponse.ok) {
    return NextResponse.json({ error: "Document branding is not ready. Apply the workspace branding migration before creating receipts." }, { status: 503 });
  }
  const brandingRows = await brandingResponse.json();
  const brandingSnapshot = Array.isArray(brandingRows) && brandingRows[0] ? brandingRows[0] : {
    company_name: c.workspaceName, primary_color: "#9f1d35", secondary_color: "#d97736",
    font_family: "Arial", template_style: "modern", logo_position: "left",
    footer_text: "Thank you for your business.",
  };

  const receiptDate = typeof b.receipt_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.receipt_date)
    ? b.receipt_date : new Date().toISOString().slice(0, 10);
  const dateKey = receiptDate.replace(/-/g, "");
  const numberResponse = await fetch(
    `${c.url}/rest/v1/sales_receipts?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=receipt_number&limit=5000`,
    { headers, cache: "no-store" },
  );
  if (!numberResponse.ok) return NextResponse.json({ error: "Unable to generate the next receipt number. Please try again." }, { status: 502 });
  const existingNumbers: Array<{ receipt_number?: string | null }> = await numberResponse.json();
  const highestSequence = existingNumbers.reduce((highest, row) => {
    const match = String(row.receipt_number || "").match(new RegExp(`^R${dateKey}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const receiptNumber = `R${dateKey}-${String(highestSequence + 1).padStart(3, "0")}`;
  const r = await fetch(`${c.url}/rest/v1/sales_receipts`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      workspace_id: c.workspaceId,
      created_by: c.session.user.id,
      receipt_number: receiptNumber,
      contact_id: typeof b.contact_id === "string" ? b.contact_id : null,
      amount,
      currency,
      payment_method: method,
      receipt_date: receiptDate,
      reference: typeof b.reference === "string" ? b.reference.slice(0, 120) || null : null,
      notes: typeof b.notes === "string" ? b.notes.slice(0, 1000) || null : null,
      branding_snapshot: brandingSnapshot,
    }),
    cache: "no-store",
  });
  if (!r.ok) return NextResponse.json({ error: "Could not save sales receipt." }, { status: 502 });
  const rows = await r.json();
  return NextResponse.json({ receipt: Array.isArray(rows) ? rows[0] : null }, { status: 201 });
}
