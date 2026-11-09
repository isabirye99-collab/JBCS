import { NextResponse } from "next/server";
import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSaasSession();
  if (!session) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const adminEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || session.user.email.trim().toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "Super Admin access is required." }, { status: 403 });
  }

  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) return NextResponse.json({ error: "Account services are not configured." }, { status: 503 });
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

  const [workspaceResponse, subscriptionResponse, memberResponse] = await Promise.all([
    fetch(`${url}/rest/v1/business_workspaces?select=id,name,slug,is_active,base_currency,created_at&order=created_at.desc&limit=1000`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/workspace_subscriptions?select=workspace_id,plan_key,status,billing_interval,billing_currency,trial_ends_at,current_period_ends_at&limit=2000`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/workspace_members?is_active=eq.true&select=workspace_id&limit=5000`, { headers, cache: "no-store" }),
  ]);

  if (!workspaceResponse.ok) return NextResponse.json({ error: "Could not load customer workspaces." }, { status: 502 });
  const workspaces = await workspaceResponse.json();
  const subscriptions = subscriptionResponse.ok ? await subscriptionResponse.json() : [];
  const members = memberResponse.ok ? await memberResponse.json() : [];
  const now = Date.now();

  const result = (Array.isArray(workspaces) ? workspaces : []).map((workspace: any) => {
    const subscription = Array.isArray(subscriptions)
      ? subscriptions.filter((s: any) => s.workspace_id === workspace.id).sort((a: any, b: any) => Date.parse(String(b.current_period_ends_at || b.trial_ends_at || "")) - Date.parse(String(a.current_period_ends_at || a.trial_ends_at || "")))[0]
      : null;
    const paidValid = subscription?.status === "active" &&
      (!subscription.current_period_ends_at || Date.parse(subscription.current_period_ends_at) > now);
    const trialValid = subscription?.status === "trialing" && Date.parse(subscription.trial_ends_at || "") > now;
    const planKey = paidValid ? (subscription.plan_key || "basic") : trialValid ? "pro" : "basic";
    return {
      ...workspace,
      planKey,
      subscriptionStatus: paidValid ? "active" : trialValid ? "trialing" : "basic",
      billingInterval: "annual",
      billingCurrency: subscription?.billing_currency || workspace.base_currency || "UGX",
      activeUsers: Array.isArray(members) ? members.filter((m: any) => m.workspace_id === workspace.id).length : 0,
    };
  });

  return NextResponse.json({ workspaces: result }, { headers: { "Cache-Control": "no-store" } });
}
