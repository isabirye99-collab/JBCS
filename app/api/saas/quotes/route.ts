import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const isValidCalendarDate = (value: unknown) => { if (typeof value !== "string") return false; const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value); if (!match) return false; const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]); const date = new Date(Date.UTC(year, month - 1, day)); return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day; };

const todayInUganda = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

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

export async function PATCH(req: Request) {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid quotation update." }, { status: 400 }); }
  const id = String(body.id || "");
  const contact_id = String(body.contact_id || "");
  const currency = String(body.currency || "UGX").toUpperCase();
  const validUntil = body.valid_until == null || body.valid_until === "" ? null : String(body.valid_until);
  if (validUntil && !isValidCalendarDate(validUntil)) return NextResponse.json({ error: "Enter a valid quotation expiry date." }, { status: 400 });
  const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  if (!/^[0-9a-f-]{36}$/i.test(id) || !/^[0-9a-f-]{36}$/i.test(contact_id) || !/^[A-Z]{3}$/.test(currency) || !items.length) {
    return NextResponse.json({ error: "Select a customer and at least one quotation line." }, { status: 400 });
  }
  const lines = items.map((item: any) => ({
    description: String(item.description || "").trim().slice(0, 500),
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_rate: Number(item.tax_rate || 0),
  }));
  if (lines.some((item: any) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0 || !Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 100)) {
    return NextResponse.json({ error: "Check quotation line descriptions, quantities, prices and tax." }, { status: 400 });
  }

  const headers = { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, "Content-Type": "application/json" };
  const quoteUrl = `${c.url}/rest/v1/quotes?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(c.workspaceId)}`;
  const customerResponse = await fetch(`${c.url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(contact_id)}&workspace_id=eq.${encodeURIComponent(c.workspaceId)}&select=id&limit=1`, { headers, cache: "no-store" });
  if (!customerResponse.ok) return NextResponse.json({ error: "Unable to verify the selected customer." }, { status: 502 });
  const customers = await customerResponse.json();
  if (!Array.isArray(customers) || !customers.length) return NextResponse.json({ error: "Choose a customer belonging to this workspace." }, { status: 400 });

  const oldQuoteResponse = await fetch(`${quoteUrl}&select=id,quote_number,contact_id,issue_date,valid_until,currency,subtotal,tax_amount,total,status,notes,created_at,business_contacts(name,email,phone,address)`, { headers, cache: "no-store" });
  if (!oldQuoteResponse.ok) return NextResponse.json({ error: "Could not load the quotation before editing." }, { status: 502 });
  const oldQuotes = await oldQuoteResponse.json();
  const oldQuote = oldQuotes[0];
  if (!oldQuote) return NextResponse.json({ error: "Quotation not found in this workspace." }, { status: 404 });
  if (["accepted", "rejected", "converted"].includes(String(oldQuote.status || "").toLowerCase())) {
    return NextResponse.json({ error: "Accepted, rejected or converted quotations cannot be edited." }, { status: 409 });
  }

  const oldItemsResponse = await fetch(`${c.url}/rest/v1/document_items?workspace_id=eq.${encodeURIComponent(c.workspaceId)}&quote_id=eq.${encodeURIComponent(id)}&document_type=eq.quote&select=id`, { headers, cache: "no-store" });
  if (!oldItemsResponse.ok) return NextResponse.json({ error: "Could not load existing quotation lines." }, { status: 502 });
  const oldItems: Array<{ id: string }> = await oldItemsResponse.json();
  const subtotal = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0);
  const tax_amount = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price * item.tax_rate / 100, 0);
  const lineRows = lines.map((item: any) => ({
    ...item, workspace_id: c.workspaceId, document_type: "quote", quote_id: id,
    line_total: item.quantity * item.unit_price * (1 + item.tax_rate / 100),
  }));

  const newItemsResponse = await fetch(`${c.url}/rest/v1/document_items`, {
    method: "POST", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(lineRows), cache: "no-store",
  });
  if (!newItemsResponse.ok) return NextResponse.json({ error: "Updated quotation lines could not be saved. The original quotation remains unchanged." }, { status: 502 });
  const newItems = await newItemsResponse.json();

  const updateResponse = await fetch(quoteUrl, {
    method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      contact_id, currency, valid_until: validUntil,
      notes: String(body.notes || "").slice(0, 2000) || null,
      subtotal, tax_amount, total: subtotal + tax_amount,
    }), cache: "no-store",
  });
  if (!updateResponse.ok) {
    const newIds = (Array.isArray(newItems) ? newItems : []).map((item: any) => item.id).filter(Boolean);
    if (newIds.length) await fetch(`${c.url}/rest/v1/document_items?id=in.(${newIds.join(",")})&workspace_id=eq.${encodeURIComponent(c.workspaceId)}`, { method: "DELETE", headers, cache: "no-store" });
    return NextResponse.json({ error: "Quotation details could not be updated. The original quotation has been retained." }, { status: 502 });
  }

  if (oldItems.length) {
    const oldIds = oldItems.map((item) => item.id).filter(Boolean);
    const deleteOldResponse = await fetch(`${c.url}/rest/v1/document_items?id=in.(${oldIds.join(",")})&workspace_id=eq.${encodeURIComponent(c.workspaceId)}&document_type=eq.quote`, {
      method: "DELETE", headers, cache: "no-store",
    });
    if (!deleteOldResponse.ok) {
      return NextResponse.json({ error: "Quotation header was updated, but old lines could not be replaced cleanly. Please contact support before editing this quotation again." }, { status: 502 });
    }
  }
  const updatedQuote = Array.isArray(updateResponse) ? updateResponse[0] : (await updateResponse.json())[0];
  return NextResponse.json({ quote: { ...(updatedQuote || oldQuote), document_items: Array.isArray(newItems) ? newItems : lineRows } });
}

export async function POST(req: Request) {
  const c = await getSaasContext();
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: c.status });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid quote." }, { status: 400 }); }

  const contact_id = String(body.contact_id || "");
  const currency = String(body.currency || "UGX").toUpperCase();
  const validUntil = body.valid_until == null || body.valid_until === "" ? null : String(body.valid_until);
  if (validUntil && (!isValidCalendarDate(validUntil) || validUntil < todayInUganda())) return NextResponse.json({ error: "Enter a valid quotation expiry date that is today or later." }, { status: 400 });
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

  const contactCheck = await fetch(
    `${c.url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(contact_id)}&workspace_id=eq.${encodeURIComponent(c.workspaceId)}&contact_type=eq.client&select=id&limit=1`,
    { headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}` }, cache: "no-store" },
  );
  if (!contactCheck.ok) return NextResponse.json({ error: "Unable to verify the selected customer." }, { status: 502 });
  const matchingContacts = await contactCheck.json();
  if (!Array.isArray(matchingContacts) || matchingContacts.length === 0) {
    return NextResponse.json({ error: "Choose a customer belonging to this workspace." }, { status: 400 });
  }

  const subtotal = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0);
  const tax_amount = lines.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price * item.tax_rate / 100, 0);
  const issueDate = todayInUganda();
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
      valid_until: validUntil, notes: String(body.notes || "").slice(0, 2000) || null,
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
