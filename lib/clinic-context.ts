import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

export async function getClinicContext() {
  const session = await getSaasSession();
  if (!session) return { error: "Please sign in to access the clinic workspace.", status: 401 as const };
  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) return { error: "Clinic services are not configured.", status: 503 as const };

  const response = await fetch(
    `${url}/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=workspace_id,role,business_workspaces!inner(id,name,slug,base_currency,is_active,workspace_subscriptions(status,trial_ends_at,current_period_ends_at))&business_workspaces.slug=eq.johnpaul-medical-center&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
  );
  if (!response.ok) return { error: "Could not verify clinic workspace access.", status: 503 as const };
  const rows = await response.json();
  const membership = Array.isArray(rows) ? rows.find((row: any) => row.business_workspaces?.is_active === true) : null;
  if (!membership) return { error: "Your account does not have access to Johnpaul Medical Center. Ask the workspace owner to grant clinic access.", status: 403 as const };

  const workspace = membership.business_workspaces;
  const subscriptionValue = workspace.workspace_subscriptions;
  const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;
  const now = Date.now();
  const trialValid = subscription?.status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at).getTime() > now;
  const paidValid = subscription?.status === "active" && (!subscription.current_period_ends_at || new Date(subscription.current_period_ends_at).getTime() > now);
  if (!trialValid && !paidValid) return { error: "The clinic workspace subscription is not active. Contact Johden support.", status: 402 as const };

  return { session, url, serviceKey, workspaceId: workspace.id as string, workspaceName: workspace.name as string, role: membership.role as string };
}
