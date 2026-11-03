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
