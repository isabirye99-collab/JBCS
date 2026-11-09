import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";
export const dynamic = "force-dynamic";
const clean = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const methods = ["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"];
const headers = (ctx: { serviceKey: string }) => ({ apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` });
export async function GET() {
 const ctx = await getSaasContext(); if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
 const base = `${ctx.url}/rest/v1`;
 const response = await fetch(`${base}/expenses?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,expense_date,category,description,supplier_contact_id,amount,currency,payment_method,notes,created_at&order=expense_date.desc&limit=500`, { headers: headers(ctx), cache: "no-store" });
 if (!response.ok) return NextResponse.json({ error: "Unable to load expenses." }, { status: 502 });
 const expenses = await response.json(); const ids = [...new Set((expenses as Array<{supplier_contact_id?: string|null}>).map(x => x.supplier_contact_id).filter((x): x is string => Boolean(x)))];
 let names: Record<string,string> = {};
 if (ids.length) { const cr = await fetch(`${base}/business_contacts?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&id=in.(${ids.join(",")})&select=id,name`, { headers: headers(ctx), cache: "no-store" }); if (cr.ok) { const contacts = await cr.json() as Array<{id:string;name:string}>; names = Object.fromEntries(contacts.map(x => [x.id,x.name])); } }
 return NextResponse.json({ expenses: (expenses as Array<Record<string, unknown>>).map(x => ({ ...x, supplier_name: x.supplier_contact_id ? names[String(x.supplier_contact_id)] || null : null })) });
}
export async function POST(request: NextRequest) {
 const ctx = await getSaasContext(); if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
 let body: Record<string, unknown>; try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid expense details." }, { status: 400 }); }
 const category = clean(body.category,100), description = clean(body.description,500), expenseDate = clean(body.expense_date,10) || new Date().toISOString().slice(0,10), currency = clean(body.currency || "UGX",3).toUpperCase(), amount = Number(body.amount), paymentMethod = clean(body.payment_method || "other",30), notes = clean(body.notes,2000), supplierId = clean(body.supplier_contact_id,64);
 if (!category || !description || !dateOk(expenseDate)) return NextResponse.json({ error: "Enter a category, description and valid date." }, { status: 400 });
 if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return NextResponse.json({ error: "Enter a valid expense amount greater than zero." }, { status: 400 });
 if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Use a valid three-letter currency." }, { status: 400 });
 if (!methods.includes(paymentMethod)) return NextResponse.json({ error: "Choose a valid payment method." }, { status: 400 });
 const h = headers(ctx); const base = `${ctx.url}/rest/v1`;
 if (supplierId) { const sr = await fetch(`${base}/business_contacts?id=eq.${encodeURIComponent(supplierId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&contact_type=eq.supplier&select=id&limit=1`, { headers: h, cache: "no-store" }); if (!sr.ok) return NextResponse.json({ error: "Unable to verify the selected supplier." }, { status: 502 }); const s = await sr.json(); if (!Array.isArray(s) || !s.length) return NextResponse.json({ error: "Choose a supplier belonging to this workspace." }, { status: 400 }); }
 const response = await fetch(`${base}/expenses`, { method:"POST", headers:{ ...h, "Content-Type":"application/json", Prefer:"return=representation" }, body:JSON.stringify({ workspace_id:ctx.workspaceId, expense_date:expenseDate, category, description, supplier_contact_id:supplierId || null, amount, currency, payment_method:paymentMethod, notes:notes || null, recorded_by:ctx.session.user.id }), cache:"no-store" });
 if (!response.ok) return NextResponse.json({ error: "Could not save the expense." }, { status: 502 }); const rows = await response.json(); return NextResponse.json({ expense:Array.isArray(rows)?rows[0]:null }, { status:201 });
}
