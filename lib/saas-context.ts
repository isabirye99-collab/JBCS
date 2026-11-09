import { cookies } from "next/headers";
import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

const BASIC_FEATURES = {
  invoicing: true, quotes: true, sales: true, expenses: true,
  basic_dashboard: true, full_accounting: false, advanced_reports: false,
  bank_reconciliation: false,
};

const PRO_FEATURES = {
  invoicing: true, quotes: true, sales: true, expenses: true,
  basic_dashboard: true, full_accounting: true, advanced_reports: true,
  bank_reconciliation: true,
};

export async function getSaasContext() {
  const session = await getSaasSession();
  if (!session) return { error: "Please sign in to continue.", status: 401 as const };

  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) {
    return { error: "Account services are not configured.", status: 503 as const };
  }

  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const configuredAdminEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin =
    Boolean(configuredAdminEmail) &&
    session.user.email.trim().toLowerCase() === configuredAdminEmail;
  const selectedId = (await cookies()).get("johden_selected_workspace")?.value;

  // Resolve active memberships first. Super Admin may also open a workspace
  // directly, without being enrolled as an ordinary workspace member.
  const membershipResponse = await fetch(
    `${url}/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=workspace_id,role,business_workspaces!inner(id,name,slug,base_currency,is_active)&limit=50`,
    { headers, cache: "no-store" }
  );
  if (!membershipResponse.ok) {
    return { error: "Could not verify workspace access.", status: 503 as const };
  }

  const rows = await membershipResponse.json();
  const memberships = Array.isArray(rows)
    ? rows.filter((row: any) => row.business_workspaces?.is_active === true)
    : [];
  let membership = selectedId
    ? memberships.find((row: any) =>
        row.workspace_id === selectedId && row.business_workspaces?.id === selectedId
      )
    : null;

  if (!membership && memberships.length === 1 && !selectedId) {
    membership = memberships[0];
  }

  // Platform-level access is granted only to the server-configured Super Admin.
  if (!membership && isSuperAdmin && selectedId) {
    const workspaceResponse = await fetch(
      `${url}/rest/v1/business_workspaces?id=eq.${encodeURIComponent(selectedId)}&is_active=eq.true&select=id,name,slug,base_currency,is_active&limit=1`,
      { headers, cache: "no-store" }
    );
    if (!workspaceResponse.ok) {
      return { error: "Could not verify the selected workspace.", status: 503 as const };
    }
    const workspaces = await workspaceResponse.json();
    if (Array.isArray(workspaces) && workspaces[0]) {
      membership = {
        workspace_id: workspaces[0].id,
        role: "owner",
        business_workspaces: workspaces[0],
      };
    }
  }

  if (!membership) {
    return {
      error: isSuperAdmin
        ? "Select a business workspace from the platform administration area."
        : memberships.length
          ? "Choose one of your authorised workspaces before accessing business data."
          : "No active business workspace is linked to this account.",
      status: memberships.length || isSuperAdmin ? 409 as const : 403 as const,
    };
  }

  const workspace = membership.business_workspaces;

  // Read the assigned plan when the SaaS plan migration is installed. During
  // staged deployments, fall back safely to the pre-migration subscription shape.
  let subscriptions: any[] = [];
  const subscriptionUrl = `${url}/rest/v1/workspace_subscriptions?workspace_id=eq.${encodeURIComponent(workspace.id)}&select=status,trial_ends_at,current_period_ends_at,plan_key&limit=50`;
  let subscriptionResponse = await fetch(subscriptionUrl, { headers, cache: "no-store" });
  if (!subscriptionResponse.ok) {
    subscriptionResponse = await fetch(
      `${url}/rest/v1/workspace_subscriptions?workspace_id=eq.${encodeURIComponent(workspace.id)}&select=status,trial_ends_at,current_period_ends_at&limit=50`,
      { headers, cache: "no-store" }
    );
  }
  if (!subscriptionResponse.ok) {
    return { error: "Could not verify subscription status.", status: 503 as const };
  }
  const subscriptionRows = await subscriptionResponse.json();
  subscriptions = Array.isArray(subscriptionRows) ? subscriptionRows : [];
  const now = Date.now();

  const validTrial = subscriptions.some((s: any) =>
    s?.status === "trialing" &&
    Number.isFinite(Date.parse(s.trial_ends_at ?? "")) &&
    Date.parse(s.trial_ends_at) > now
  );
  const validPaid = subscriptions.some((s: any) =>
    s?.status === "active" &&
    (!s.current_period_ends_at ||
      (Number.isFinite(Date.parse(s.current_period_ends_at)) &&
       Date.parse(s.current_period_ends_at) > now))
  );
  const storedPlanKey = subscriptions.find((s: any) => s?.plan_key)?.plan_key ?? "basic";
  // An unexpired trial keeps the existing full-access trial behaviour. When a
  // paid period expires, access safely falls back to Basic without deleting data.
  const planKey = isSuperAdmin ? "pro" : validPaid ? storedPlanKey : validTrial ? (storedPlanKey === "basic" ? "pro" : storedPlanKey) : "basic";

  let planFeatures: Record<string, boolean> =
    planKey === "pro" ? PRO_FEATURES : BASIC_FEATURES;
  let maxUsers: number | null = planKey === "basic" ? 1 : null;
  try {
    const planResponse = await fetch(
      `${url}/rest/v1/saas_plans?plan_key=eq.${encodeURIComponent(planKey)}&is_active=eq.true&select=features,max_users&limit=1`,
      { headers, cache: "no-store" }
    );
    if (planResponse.ok) {
      const planRows = await planResponse.json();
      if (Array.isArray(planRows) && planRows[0]) {
        if (planRows[0].features && typeof planRows[0].features === "object") {
          planFeatures = planRows[0].features;
        }
        maxUsers = typeof planRows[0].max_users === "number" ? planRows[0].max_users : null;
      }
    }
  } catch {
    // Keep conservative built-in entitlements if the plan catalogue is not yet deployed.
  }

  // Keep existing trial-write override strictly local and never use it as a production bypass.
  const allowLocalTrialWrites =
    process.env.NODE_ENV !== "production" &&
    process.env.JBCS_ALLOW_TRIAL_WRITES === "true";

  if (planKey !== "basic" && !isSuperAdmin && !validPaid && !validTrial && !allowLocalTrialWrites) {
    return { error: "Your paid subscription is not active. Your workspace has Basic access.", status: 402 as const };
  }

  if (!isSuperAdmin && !["owner", "admin", "finance"].includes(membership.role)) {
    return { error: "Your workspace role does not permit finance changes.", status: 403 as const };
  }

  return {
    session,
    url,
    serviceKey,
    workspaceId: workspace.id as string,
    workspaceName: workspace.name as string,
    role: isSuperAdmin ? "owner" : membership.role as string,
    isSuperAdmin,
    planKey,
    planFeatures,
    maxUsers,
    subscriptionStatus: validPaid ? "active" : validTrial ? "trialing" : "basic",
  };
}
