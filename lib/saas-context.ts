import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

export async function getSaasContext() {
  const session = await getSaasSession();
  if (!session) return { error: "Please sign in to continue.", status: 401 as const };
  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) return { error: "Account services are not configured.", status: 503 as const };

  const response = await fetch(
    `${url}/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=workspace_id,role,business_workspaces!inner(id,name,slug,base_currency,is_active,workspace_subscriptions(status,trial_ends_at,current_period_ends_at))&limit=10`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );
  if (!response.ok) return { error: "Could not verify workspace access.", status: 503 as const };
  const rows = await response.json();
  const memberships = Array.isArray(rows) ? rows.filter((row: any) => row.business_workspaces?.is_active === true) : [];
  if (!memberships.length) return { error: "No active business workspace is linked to this account.", status: 403 as const };
  if (memberships.length > 1) return { error: "This account has multiple workspaces. Workspace selection must be completed before accessing finance data.", status: 409 as const };

  const membership = memberships[0];
  const workspace = membership.business_workspaces;
  const subValue = workspace.workspace_subscriptions;
  const subscription = Array.isArray(subValue) ? subValue[0] : subValue;
  const now = Date.now();
  const trialValid = subscription?.status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at).getTime() > now;
  const paidValid = subscription?.status === "active" && (!subscription.current_period_ends_at || new Date(subscription.current_period_ends_at).getTime() > now);
  if (!trialValid && !paidValid) {
    return { error: "Your trial or subscription is not active. Contact Johden to activate billing.", status: 402 as const };
  }
  if (!["owner", "admin", "finance"].includes(membership.role)) {
    return { error: "Your workspace role does not permit finance changes.", status: 403 as const };
  }
  return { session, url, serviceKey, workspaceId: workspace.id as string, workspaceName: workspace.name as string, role: membership.role as string };
}
