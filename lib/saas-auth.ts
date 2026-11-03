import { cookies } from "next/headers";

export const SAAS_SESSION_COOKIE = "johden_saas_session";

export function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function getSaasSession() {
  const token = (await cookies()).get(SAAS_SESSION_COOKIE)?.value;
  if (!token) return null;
  const { url, anonKey } = supabaseConfig();
  if (!url || !anonKey) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id || !user?.email) return null;
    return { token, user: { id: String(user.id), email: String(user.email) } };
  } catch {
    return null;
  }
}

export async function getWorkspaceForUser(userId: string) {
  const { url, serviceKey } = supabaseConfig();
  if (!url || !serviceKey) return null;
  const response = await fetch(
    `${url}/rest/v1/workspace_members?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select:workspace_id,role,business_workspaces(id,name,slug,base_currency,is_active),workspace_subscriptions(status,billing_interval,billing_currency,trial_ends_at,current_period_ends_at)&limit=10`.replace("select:","select="),
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey} ` }, cache: "no-store" }
  );
  if (!response.ok) return null;
  const rows = await response.json();
  if (!Array.isArray(rows)) return null;
  // A signed-in account can only access workspaces to which it has an active membership.
  return rows.filter((row: any) => row.business_workspaces?.is_active === true);
}
