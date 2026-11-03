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
    const wid = await workspace(url,key); if (!wid) return fail("JBCS workspace not found or inactive.",503);
    const r = await fetch(`${url}/rest/v1/recurring_expense_templates?workspace_id=eq.${encodeURIComponent(wid)}&select=*&order=next_run_date.asc`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});
    if (!r.ok) return fail("Unable to load recurring expenses.",502);
    return NextResponse.json({templates:await r.json()});
  } catch { return fail("Unable to connect to finance database.",502); }
}
export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised",401);
  const {url,key}=config(); if(!url||!key) return fail("Finance database configuration is missing.",503);
  let b:Record<string,unknown>; try{b=await request.json();}catch{return fail("Invalid recurring expense details.");}
  const name=typeof b.name==="string"?b.name.trim().slice(0,150):"";
  const category=typeof b.category==="string"?b.category.trim().slice(0,100):"";
  const description=typeof b.description==="string"?b.description.trim().slice(0,500):"";
  const amount=Number(b.amount), rate=Number(b.exchange_rate??1), currency=String(b.currency||"UGX").toUpperCase(), frequency=String(b.frequency||"");
  const method=String(b.payment_method||"other"), supplier=typeof b.supplier_contact_id==="string"?b.supplier_contact_id:"";
  if(!name||!category||!description||!Number.isFinite(amount)||amount<=0||amount>9_999_999_999_999_999||!Number.isFinite(rate)||rate<=0||rate>999_999_999_999||!/^[A-Z]{3}$/.test(currency)||!frequencies.includes(frequency)||!validDate(b.next_run_date)||(b.end_date&&(!validDate(b.end_date)||String(b.end_date)<String(b.next_run_date)))||!["cash","bank_transfer","mobile_money","card","cheque","other"].includes(method)) return fail("Check the expense details, currency, frequency and schedule dates.");
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(supplier&&!uuid.test(supplier)) return fail("Select a valid supplier.");
  try {
    const wid=await workspace(url,key); if(!wid) return fail("JBCS workspace not found or inactive.",503);
    if(supplier){const sr=await fetch(`${url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(supplier)}&workspace_id=eq.${encodeURIComponent(wid)}&contact_type=eq.supplier&select=id&limit=1`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});const rows=sr.ok?await sr.json():[];if(!Array.isArray(rows)||rows.length!==1)return fail("Supplier not found in this workspace.");}
    const r=await fetch(`${url}/rest/v1/recurring_expense_templates?select=*`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({workspace_id:wid,name,category,description,amount,currency,exchange_rate:rate,payment_method:method,supplier_contact_id:supplier||null,notes:typeof b.notes==="string"?b.notes.trim().slice(0,2000)||null:null,frequency,next_run_date:b.next_run_date,end_date:b.end_date||null,is_active:true}),cache:"no-store"});
    if(!r.ok){console.error("Recurring expense template save failed:",await r.text());return fail("Unable to save recurring expense template.",502);}
    return NextResponse.json({template:(await r.json())[0]},{status:201});
  }catch{return fail("Unable to connect to finance database.",502);}
}
