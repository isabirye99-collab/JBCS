import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const METHODS = ["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const response = await fetch(
    `${ctx.url}/rest/v1/sales_receipts?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,receipt_number,contact_id,sale_date,currency,subtotal,tax_amount,total,payment_method,payment_reference,notes,created_at,business_contacts(name,email,phone,address),sales_receipt_items(id,description,quantity,unit_price,tax_rate,line_total)&order=sale_date.desc,created_at.desc&limit=1000`,
    { headers: headers(ctx.serviceKey), cache: "no-store" },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Sales receipts list failed", response.status, detail.slice(0, 250));
    return NextResponse.json({ error: "Unable to load direct sales receipts." }, { status: 502 });
  }
  return NextResponse.json({ receipts: await response.json() });
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Enter valid sales receipt details." }, { status: 400 }); }

  const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
  const contactId = text(body.contact_id, 64);
  const saleDate = text(body.sale_date, 10) || new Date().toISOString().slice(0, 10);
  const currency = text(body.currency, 3).toUpperCase();
  const paymentMethod = text(body.payment_method, 30);
  const paymentReference = text(body.payment_reference, 120);
  const notes = text(body.notes, 2000);
  if (contactId && !UUID.test(contactId)) return NextResponse.json({ error: "Choose a valid customer or leave the customer blank." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate) || Number.isNaN(Date.parse(saleDate)) || new Date(saleDate + "T00:00:00Z").toISOString().slice(0,10) !== saleDate) {
    return NextResponse.json({ error: "Enter a valid sale date." }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Choose a valid three-letter currency." }, { status: 400 });
  if (!METHODS.includes(paymentMethod)) return NextResponse.json({ error: "Choose a supported payment method." }, { status: 400 });
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 500) return NextResponse.json({ error: "Add between 1 and 500 sales line items." }, { status: 400 });
  const items = body.items.map((value: unknown) => {
    const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      description: text(row.description, 500),
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      tax_rate: Number(row.tax_rate ?? 0),
    };
  });
  if (items.some((item) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000000 || !Number.isFinite(item.unit_price) || item.unit_price < 0 || item.unit_price > 1e12 || !Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 100)) {
    return NextResponse.json({ error: "Check every sales line's description, quantity, price and tax rate." }, { status: 400 });
  }

  const response = await fetch(`${ctx.url}/rest/v1/rpc/create_workspace_sales_receipt`, {
    method: "POST",
    headers: { ...headers(ctx.serviceKey), "Content-Type": "application/json" },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_created_by: ctx.session.user.id,
      p_contact_id: contactId || null,
      p_sale_date: saleDate,
      p_currency: currency,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentReference || null,
      p_notes: notes || null,
      p_items: items,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Direct sales receipt RPC failed", response.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Sales receipt could not be saved. No receipt confirmation was returned." }, { status: 502 });
  }
  const receipt = await response.json();
  if (!receipt?.id || !receipt?.receipt_number) return NextResponse.json({ error: "Sales receipt could not be confirmed." }, { status: 502 });
  return NextResponse.json({ receipt }, { status: 201 });
}
