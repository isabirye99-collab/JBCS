import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });

  const url = `${c.url}/rest/v1/quotes?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=id,quote_number,contact_id,issue_date,valid_until,currency,subtotal,tax_amount,total,status,notes,created_at,business_contacts(name,email,phone,address),document_items(id,description,quantity,unit_price,tax_rate,line_total)&order=created_at.desc&limit=500`;
  const response = await fetch(url, {
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Could not load quotations and their line items." }, { status: 502 });
  }

  const quotes = await response.json();
  return NextResponse.json({ quotes: Array.isArray(quotes) ? quotes : [] });
}

export async function POST(req: Request) {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid quote." }, { status: 400 }); }

  const contact_id = String(body.contact_id || "");
  const currency = String(body.currency || "UGX").toUpperCase();
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!/^[0-9a-f-]{36}$/i.test(contact_id) || !/^[A-Z]{3}$/.test(currency) || !items.length) {
    return NextResponse.json({ error: "Select a customer and at least one line item." }, { status: 400 });
  }

  const lines = items.map((item: any) => ({
    description: String(item.description || "").trim().slice(0, 500),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: Number(item.tax_rate || 0),
  }));
  if (lines.some((item: any) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0 || !Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 100)) {
    return NextResponse.json({ error: "Check quote line descriptions, quantities, prices and tax." }, { status: 400 });
  }

  const subtotal = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0);
  const tax_amount = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price * item.tax_rate / 100, 0);
  const issueDate = new Date().toISOString().slice(0, 10);
  const numberResponse = await fetch(
    `${c.url}/rest/v1/quotes?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=quote_number&limit=5000`,
    { headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` }, cache: "no-store" },
  );
  if (!numberResponse.ok) return NextResponse.json({ error: "Unable to generate a quotation number. Please try again." }, { status: 502 });
  const existingNumbers: Array<{ quote_number?: string | null }> = await numberResponse.json();
  const highestSequence = existingNumbers.reduce((highest, row) => {
    const match = String(row.quote_number || "").match(/^JBCS\s*Q\s*(\d+)$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const quote_number = `JBCS Q ${String(highestSequence + 1).padStart(4, "0")}`;
  const headerResponse = await fetch(`${c.url}/rest/v1/quotes`, {
    method: "POST",
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      workspace_id: c.workspaceId, created_by: c.session.user.id, contact_id, currency,
      quote_number, issue_date: issueDate, subtotal, tax_amount, total: subtotal + tax_amount,
      valid_until: body.valid_until || null, notes: String(body.notes || "").slice(0, 2000) || null,
    }),
    cache: "no-store",
  });
  if (!headerResponse.ok) return NextResponse.json({ error: "Could not create quote." }, { status: 502 });
  const quote = (await headerResponse.json())[0];
  if (!quote?.id) return NextResponse.json({ error: "Quote was not returned after creation." }, { status: 502 });

  const lineRows = lines.map((item: any) => ({
    ...item, workspace_id: c.workspaceId, document_type: "quote", quote_id: quote.id,
    line_total: item.quantity * item.unit_price * (1 + item.tax_rate / 100),
  }));
  const itemsResponse = await fetch(`${c.url}/rest/v1/document_items`, {
    method: "POST",
    headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(lineRows),
    cache: "no-store",
  });
  if (!itemsResponse.ok) {
    await fetch(`${c.url}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}&workspace_id=eq.${encodeURIComponent(c.workspaceId)}`, {
      method: "DELETE", headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` }, cache: "no-store",
    });
    return NextResponse.json({ error: "Quote line items could not be saved; the incomplete quote was rolled back." }, { status: 502 });
  }

  const savedItems = await itemsResponse.json();
  return NextResponse.json({ quote: { ...quote, document_items: Array.isArray(savedItems) ? savedItems : lineRows } }, { status: 201 });
}
