import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function config() {
  return { url: process.env.SUPABASE_URL?.replace(/\/+$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}
async function workspace(url: string, key: string) {
  const r = await fetch(`${url}/rest/v1/business_workspaces?slug=eq.jbcs&is_active=eq.true&select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) && rows.length === 1 ? rows[0].id as string : null;
}
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const validDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z")) && new Date(v + "T00:00:00Z").toISOString().slice(0,10) === v;
const frequencies = ["weekly", "monthly", "quarterly", "yearly"];

export async function GET() {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);
  const { url, key } = config(); if (!url || !key) return fail("Finance database configuration is missing.", 503);
  try {
    const wid = await workspace(url, key); if (!wid) return fail("JBCS workspace not found or inactive.", 503);
    const r = await fetch(`${url}/rest/v1/recurring_invoice_templates?workspace_id=eq.${encodeURIComponent(wid)}&select=*&order=next_run_date.asc`, { headers: { apikey:key, Authorization:`Bearer ${key}` }, cache:"no-store" });
    if (!r.ok) return fail("Unable to load recurring invoices.", 502);
    return NextResponse.json({ templates: await r.json() });
  } catch { return fail("Unable to connect to finance database.", 502); }
}
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);
  const { url, key } = config(); if (!url || !key) return fail("Finance database configuration is missing.", 503);
  let b: Record<string, unknown>; try { b = await request.json(); } catch { return fail("Invalid recurring invoice details."); }
  const name = typeof b.name === "string" ? b.name.trim().slice(0,150) : "";
  const contactId = typeof b.contact_id === "string" ? b.contact_id : "";
  const currency = typeof b.currency === "string" ? b.currency.toUpperCase() : "UGX";
  const rate = Number(b.exchange_rate ?? 1), frequency = String(b.frequency || "");
  if (!name || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactId)) return fail("Enter a name and valid customer.");
  if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(rate) || rate <= 0 || !frequencies.includes(frequency) || !validDate(b.next_run_date) || (b.end_date && (!validDate(b.end_date) || String(b.end_date) < String(b.next_run_date)))) return fail("Check currency, exchange rate, frequency and schedule dates.");
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100 || !b.items.every((x:any) => x && typeof x.description === "string" && x.description.trim() && Number.isFinite(Number(x.quantity)) && Number(x.quantity)>0 && Number.isFinite(Number(x.unit_price)) && Number(x.unit_price)>=0 && Number.isFinite(Number(x.tax_rate ?? 0)) && Number(x.tax_rate ?? 0)>=0 && Number(x.tax_rate ?? 0)<=100)) return fail("Add 1–100 valid invoice items.");
  try {
    const wid = await workspace(url,key); if (!wid) return fail("JBCS workspace not found or inactive.",503);
    const cr = await fetch(`${url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(contactId)}&workspace_id=eq.${encodeURIComponent(wid)}&contact_type=eq.client&select=id&limit=1`, {headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
    const contacts = cr.ok ? await cr.json() : [];
    if (!Array.isArray(contacts) || contacts.length !== 1) return fail("Customer not found in this workspace.");
    const items = (b.items as Record<string,unknown>[]).map(x=>({description:String(x.description).trim().slice(0,500),quantity:Number(x.quantity),unit_price:Number(x.unit_price),tax_rate:Number(x.tax_rate ?? 0)}));
    const r = await fetch(`${url}/rest/v1/recurring_invoice_templates?select=*`, {method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({workspace_id:wid,contact_id:contactId,name,currency,exchange_rate:rate,items,notes:typeof b.notes==="string"?b.notes.trim().slice(0,2000)||null:null,frequency,next_run_date:b.next_run_date,end_date:b.end_date||null,is_active:true}),cache:"no-store"});
    if (!r.ok) { console.error("Recurring invoice template save failed:", await r.text()); return fail("Unable to save recurring invoice template.",502); }
    return NextResponse.json({template:(await r.json())[0]}, {status:201});
  } catch { return fail("Unable to connect to finance database.",502); }
}
export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);
  const { url, key } = config();
  if (!url || !key) return fail("Finance database configuration is missing.", 503);
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return fail("Invalid schedule update."); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || typeof body.is_active !== "boolean") return fail("Select a valid schedule and status.");
  try {
    const wid = await workspace(url, key);
    if (!wid) return fail("JBCS workspace not found or inactive.", 503);
    const response = await fetch(`${url}/rest/v1/recurring_invoice_templates?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(wid)}&select=id,is_active`, {
      method: "PATCH",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ is_active: body.is_active, updated_at: new Date().toISOString() }),
      cache: "no-store",
    });
    if (!response.ok) return fail("Unable to update recurring schedule.", 502);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) return fail("Schedule not found in this workspace.", 404);
    return NextResponse.json({ template: rows[0] });
  } catch { return fail("Unable to connect to finance database.", 502); }
}
