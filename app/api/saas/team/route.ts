import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });
const emailOk = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function getMembers(ctx: any) {
  const base = `${ctx.url}/rest/v1`;
  const [memberResponse, usersResponse] = await Promise.all([
    fetch(`${base}/workspace_members?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,user_id,role,is_active,created_at&order=created_at.asc&limit=1000`, { headers: headers(ctx.serviceKey), cache: "no-store" }),
    fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: headers(ctx.serviceKey), cache: "no-store" }),
  ]);
  if (!memberResponse.ok) throw new Error("Could not load workspace team members.");
  const members = await memberResponse.json();
  const usersPayload = usersResponse.ok ? await usersResponse.json() : {};
  const users = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
  const byId = new Map(users.map((user: any) => [String(user.id), String(user.email || "")]));
  return (Array.isArray(members) ? members : []).map((member: any) => ({
    ...member,
    email: byId.get(String(member.user_id)) || "",
    isSelf: member.user_id === ctx.session.user.id,
  }));
}

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isSuperAdmin && !["owner", "admin"].includes(ctx.role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can manage team access." }, { status: 403 });
  }
  try {
    const members = await getMembers(ctx);
    return NextResponse.json({
      members,
      plan: { key: ctx.planKey, maxUsers: ctx.maxUsers, activeUsers: members.filter((m: any) => m.is_active).length },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load team access." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isSuperAdmin && !["owner", "admin"].includes(ctx.role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can invite team members." }, { status: 403 });
  }
  if (ctx.planKey === "basic" && !ctx.isSuperAdmin) {
    return NextResponse.json({ error: "The Basic Plan includes one registered user. Upgrade to Pro Accounting to invite team members." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter a valid email address and role." }, { status: 400 }); }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? body.role : "finance";
  if (!emailOk(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!["admin", "finance"].includes(role)) return NextResponse.json({ error: "Choose Admin or Finance as the workspace role." }, { status: 400 });

  const base = `${ctx.url}/rest/v1`;
  const h = headers(ctx.serviceKey);
  const memberResponse = await fetch(`${base}/workspace_members?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,user_id,role,is_active&limit=1000`, { headers: h, cache: "no-store" });
  if (!memberResponse.ok) return NextResponse.json({ error: "Could not verify the workspace user limit." }, { status: 502 });
  const currentMembers = await memberResponse.json();
  const activeMemberCount = Array.isArray(currentMembers) ? currentMembers.filter((m: any) => m.is_active).length : 0;
  if (ctx.maxUsers !== null && activeMemberCount >= ctx.maxUsers) {
    return NextResponse.json({ error: `Your current plan allows ${ctx.maxUsers} active user(s). Upgrade or increase the plan limit before inviting another user.` }, { status: 403 });
  }

  const usersResponse = await fetch(`${ctx.url}/auth/v1/admin/users?page=1&per_page=1000`, { headers: h, cache: "no-store" });
  if (!usersResponse.ok) return NextResponse.json({ error: "Could not verify the invited account." }, { status: 502 });
  const usersPayload = await usersResponse.json();
  const users = Array.isArray(usersPayload?.users) ? usersPayload.users : [];
  let user = users.find((candidate: any) => String(candidate.email || "").toLowerCase() === email);
  let newlyInvited = false;

  if (!user) {
    const inviteResponse = await fetch(`${ctx.url}/auth/v1/invite`, {
      method: "POST",
      headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, data: { invited_to_workspace: ctx.workspaceId, workspace_name: ctx.workspaceName } }),
      cache: "no-store",
    });
    const inviteData = await inviteResponse.json().catch(() => ({}));
    if (!inviteResponse.ok || !inviteData?.id) {
      return NextResponse.json({ error: inviteData?.msg || inviteData?.message || "Could not send the invitation. Check the Supabase email invitation settings." }, { status: 502 });
    }
    user = inviteData;
    newlyInvited = true;
  }

  const existing = Array.isArray(currentMembers) ? currentMembers.find((m: any) => m.user_id === user.id) : null;
  if (existing?.is_active) return NextResponse.json({ error: "This user already belongs to the workspace." }, { status: 409 });
  if (existing && !existing.is_active) {
    const reactivate = await fetch(`${base}/workspace_members?id=eq.${encodeURIComponent(existing.id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, {
      method: "PATCH",
      headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ is_active: true, role }),
      cache: "no-store",
    });
    if (!reactivate.ok) return NextResponse.json({ error: "Could not reactivate this user's workspace access. Check the plan limit." }, { status: 409 });
    return NextResponse.json({ success: true, message: "Existing workspace access reactivated." }, { status: 200 });
  }

  const insertResponse = await fetch(`${base}/workspace_members`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: ctx.workspaceId, user_id: user.id, role, is_active: true }),
    cache: "no-store",
  });
  if (!insertResponse.ok) {
    // The database trigger is the final authority on user limits. Avoid claiming
    // success if a concurrent invite filled the final seat.
    return NextResponse.json({ error: newlyInvited ? "The invitation was sent, but the workspace could not add the user. Check the plan limit before inviting again." : "Could not add this user to the workspace. Check the plan limit and existing memberships." }, { status: 409 });
  }
  return NextResponse.json({ success: true, message: newlyInvited ? "Invitation sent and workspace access created." : "Existing account added to the workspace.", member: (await insertResponse.json())?.[0] ?? null }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!ctx.isSuperAdmin && !["owner", "admin"].includes(ctx.role)) {
    return NextResponse.json({ error: "Only workspace owners or admins can change team access." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter valid member details." }, { status: 400 }); }
  const memberId = typeof body.member_id === "string" ? body.member_id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(memberId)) {
    return NextResponse.json({ error: "Choose a valid workspace member." }, { status: 400 });
  }
  const base = `${ctx.url}/rest/v1`;
  const h = headers(ctx.serviceKey);
  const lookup = await fetch(`${base}/workspace_members?id=eq.${encodeURIComponent(memberId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,user_id,role,is_active&limit=1`, { headers: h, cache: "no-store" });
  const rows = lookup.ok ? await lookup.json() : [];
  const member = Array.isArray(rows) ? rows[0] : null;
  if (!member) return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
  if (member.user_id === ctx.session.user.id || member.role === "owner") {
    return NextResponse.json({ error: "The workspace owner and your own access cannot be deactivated here." }, { status: 400 });
  }
  const response = await fetch(`${base}/workspace_members?id=eq.${encodeURIComponent(memberId)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}`, {
    method: "PATCH",
    headers: { ...h, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ is_active: false }),
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Could not deactivate workspace access." }, { status: 502 });
  return NextResponse.json({ success: true });
}
