import { NextRequest, NextResponse } from "next/server";
import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

async function requireSuperAdmin() {
  const session = await getSaasSession();
  if (!session) return { error: "Please sign in.", status: 401 as const };
  const adminEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || session.user.email.trim().toLowerCase() !== adminEmail) {
    return { error: "Super Admin access is required.", status: 403 as const };
  }
  const config = supabaseConfig();
  const url = config.url;
  const serviceKey = config.serviceKey;
  if (!url || !serviceKey) return { error: "Account services are not configured.", status: 503 as const };
  return { url, serviceKey, session };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const response = await fetch(
    `${auth.url}/rest/v1/saas_plans?select=id,plan_key,name,description,price_amount,currency,billing_interval,max_users,features,is_active,sort_order&order=sort_order.asc`,
    { headers: { apikey: auth.serviceKey, Authorization: `Bearer ${auth.serviceKey}` }, cache: "no-store" }
  );
  if (!response.ok) return NextResponse.json({ error: "Could not load subscription plans. Apply the SaaS plan migration first." }, { status: 503 });
  return NextResponse.json({ plans: await response.json() }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid plan details." }, { status: 400 }); }

  // Basic must remain free and limited to one registered user.
  if (body.plan_key !== "pro") return NextResponse.json({ error: "Only Pro Accounting pricing and user limits can be changed here." }, { status: 400 });
  const price = Number(body.price_amount);
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "";
  const maxUsersRaw = body.max_users;
  const maxUsers = maxUsersRaw === null || maxUsersRaw === "" ? null : Number(maxUsersRaw);
  if (!Number.isFinite(price) || price <= 0 || price > 1e12) return NextResponse.json({ error: "Set a Pro annual price greater than zero." }, { status: 400 });
  if (!["UGX", "USD"].includes(currency)) return NextResponse.json({ error: "Choose UGX or USD for the annual plan price." }, { status: 400 });
  if (maxUsers !== null && (!Number.isInteger(maxUsers) || maxUsers < 2 || maxUsers > 100000)) {
    return NextResponse.json({ error: "Set the user limit to at least 2, or leave it blank for no limit." }, { status: 400 });
  }

  const response = await fetch(
    `${auth.url}/rest/v1/saas_plans?plan_key=eq.pro`,
    {
      method: "PATCH",
      headers: {
        apikey: auth.serviceKey,
        Authorization: `Bearer ${auth.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ price_amount: price, currency, max_users: maxUsers, updated_at: new Date().toISOString() }),
      cache: "no-store",
    }
  );
  if (!response.ok) return NextResponse.json({ error: "Could not save Pro pricing. Confirm the SaaS plan migration has been applied." }, { status: 502 });
  const rows = await response.json();
  if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "The Pro Accounting plan was not found." }, { status: 404 });
  return NextResponse.json({ plan: rows[0], message: "Annual Pro Accounting plan settings saved." });
}
