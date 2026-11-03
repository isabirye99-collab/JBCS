import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const url = `${ctx.url}/rest/v1/invoices?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,invoice_number,contact_id,issue_date,due_date,currency,subtotal,tax_amount,total,amount_paid,status,notes,created_at,business_contacts(name),document_items(id,description,quantity,unit_price,tax_rate,line_total)&order=created_at.desc&limit=200`;
  const response = await fetch(url, {
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Unable to load invoices." }, { status: 502 });
  return NextResponse.json({ invoices: await response.json() });
}

export async function POST(request: import("next/server").NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid invoice details." }, { status: 400 }); }
  const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const contactId = str(body.contact_id, 64);
  const issueDate = str(body.issue_date, 10) || new Date().toISOString().slice(0, 10);
  const dueDate = str(body.due_date, 10);
  const currency = str(body.currency || "UGX", 3).toUpperCase();
  const notes = str(body.notes, 2000);
  const items = body.items;
  const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0,10) === v;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactId)) return NextResponse.json({ error: "Choose a valid customer." }, { status: 400 });
  if (!validDate(issueDate) || (dueDate && !validDate(dueDate)) || (dueDate && dueDate < issueDate)) return NextResponse.json({ error: "Check the invoice and due dates." }, { status: 400 });
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Use a valid three-letter invoice currency." }, { status: 400 });
  if (!Array.isArray(items) || items.length < 1 || items.length > 100) return NextResponse.json({ error: "Add between 1 and 100 invoice items." }, { status: 400 });

  const cleanItems: Array<{description:string;quantity:number;unit_price:number;tax_rate:number;line_total:number}> = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid invoice item." }, { status: 400 });
    const item = raw as Record<string, unknown>;
    const description = str(item.description, 500);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unit_price);
    const taxRate = Number(item.tax_rate ?? 0);
    if (!description || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1e12 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return NextResponse.json({ error: "Check item description, quantity, price and tax." }, { status: 400 });
    const base = Math.round(quantity * unitPrice * 100) / 100;
    const tax = Math.round(base * taxRate) / 100;
    const lineTotal = Math.round((base + tax) * 100) / 100;
    if (![base,tax,lineTotal].every(Number.isFinite) || lineTotal > 9e15) return NextResponse.json({ error: "An invoice item amount is too large." }, { status: 400 });
    cleanItems.push({ description, quantity, unit_price: unitPrice, tax_rate: taxRate, line_total: lineTotal });
  }
  const invoiceNumber = `INV-${issueDate.replace(/-/g,"")}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const rpc = await fetch(`${ctx.url}/rest/v1/rpc/create_workspace_invoice`, {
    method: "POST",
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_created_by: ctx.session.user.id,
      p_contact_id: contactId,
      p_invoice_number: invoiceNumber,
      p_issue_date: issueDate,
      p_due_date: dueDate || null,
      p_currency: currency,
      p_notes: notes || null,
      p_items: cleanItems.map(({ description, quantity, unit_price, tax_rate }) => ({ description, quantity, unit_price, tax_rate })),
    }),
    cache: "no-store",
  });
  if (!rpc.ok) {
    const detail = await rpc.text().catch(() => "");
    if (rpc.status === 400 || rpc.status === 404) return NextResponse.json({ error: "Invoice details were rejected. Confirm the customer and item values, then try again." }, { status: 400 });
    return NextResponse.json({ error: "Could not create invoice atomically. No partial invoice was saved." }, { status: 502 });
  }
  const result = await rpc.json();
  if (!result?.invoice?.id || !Array.isArray(result?.document_items)) {
    return NextResponse.json({ error: "Invoice creation could not be confirmed." }, { status: 502 });
  }
  return NextResponse.json({ invoice: { ...result.invoice, document_items: result.document_items } }, { status: 201 });
}
