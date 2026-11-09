import { cookies } from "next/headers";
import { getSaasSession, supabaseConfig } from "@/lib/saas-auth";

export async function getSaasContext() {
  const session = await getSaasSession();
  if (!session) return { error: "Please sign in to continue.", status: 401 as const };

  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) {
    return { error: "Account services are not configured.", status: 503 as const };
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  // Resolve workspace membership separately from subscription data. This avoids
  // relying on PostgREST's nested one-to-many relationship shape for billing.
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

  if (!memberships.length) {
    return { error: "No active business workspace is linked to this account.", status: 403 as const };
  }

  const selectedId = (await cookies()).get("johden_selected_workspace")?.value;
  let membership = selectedId
    ? memberships.find(
        (row: any) =>
          row.workspace_id === selectedId &&
          row.business_workspaces?.id === selectedId
      )
    : null;

  if (!membership && memberships.length === 1) membership = memberships[0];

  if (!membership) {
    return {
      error: "Choose one of your authorised workspaces before accessing finance data.",
      status: 409 as const,
    };
  }

  const workspace = membership.business_workspaces;

  // Fetch all subscription records for this workspace and accept any currently
  // valid trial or paid period. Do not modify subscription or billing records.
  const subscriptionResponse = await fetch(
    `${url}/rest/v1/workspace_subscriptions?workspace_id=eq.${encodeURIComponent(workspace.id)}&select=status,trial_ends_at,current_period_ends_at&limit=50`,
    { headers, cache: "no-store" }
  );

  if (!subscriptionResponse.ok) {
    return { error: "Could not verify subscription status.", status: 503 as const };
  }

  const subscriptionRows = await subscriptionResponse.json();
  const subscriptions = Array.isArray(subscriptionRows) ? subscriptionRows : [];
  const now = Date.now();

  const hasValidSubscription = subscriptions.some((subscription: any) => {
    const trialEnd = subscription?.trial_ends_at
      ? new Date(subscription.trial_ends_at).getTime()
      : Number.NaN;
    const periodEnd = subscription?.current_period_ends_at
      ? new Date(subscription.current_period_ends_at).getTime()
      : null;

    const trialValid =
      subscription?.status === "trialing" &&
      Number.isFinite(trialEnd) &&
      trialEnd > now;

    const paidValid =
      subscription?.status === "active" &&
      (periodEnd === null || (Number.isFinite(periodEnd) && periodEnd > now));

    return trialValid || paidValid;
  });

  // Local development/testing only: this override is intentionally disabled
  // in production; production must use a real subscription status.
  const allowLocalTrialWrites =
    process.env.NODE_ENV !== "production" &&
    process.env.JBCS_ALLOW_TRIAL_WRITES === "true";

  const configuredAdminEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin =
    Boolean(configuredAdminEmail) &&
    session.user.email.trim().toLowerCase() === configuredAdminEmail;

  if (!isSuperAdmin && !allowLocalTrialWrites && !hasValidSubscription) {
    return {
      error: "Your trial or subscription is not active. Contact Johden to activate billing.",
      status: 402 as const,
    };
  }

  if (!["owner", "admin", "finance"].includes(membership.role)) {
    return {
      error: "Your workspace role does not permit finance changes.",
      status: 403 as const,
    };
  }

  return {
    session,
    url,
    serviceKey,
    workspaceId: workspace.id as string,
    workspaceName: workspace.name as string,
    role: membership.role as string,
  };
}
