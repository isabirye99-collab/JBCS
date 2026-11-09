import { NextRequest, NextResponse } from "next/server";
import { getSaasSession, getWorkspaceForUser, supabaseConfig } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSaasSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const workspaceId = String(form.get("workspace_id") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return NextResponse.redirect(new URL("/workspace?selection=invalid", request.url));
  }

  const configuredAdminEmail = process.env.JBCS_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuperAdmin = Boolean(configuredAdminEmail) && session.user.email.trim().toLowerCase() === configuredAdminEmail;
  let authorised = false;

  if (isSuperAdmin) {
    const { url, serviceKey } = supabaseConfig();
    if (!url || !serviceKey) return NextResponse.redirect(new URL("/workspace?selection=unavailable", request.url));
    const response = await fetch(
      `${url}/rest/v1/business_workspaces?id=eq.${encodeURIComponent(workspaceId)}&is_active=eq.true&select=id&limit=1`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, cache: "no-store" }
    );
    if (response.ok) {
      const rows = await response.json();
      authorised = Array.isArray(rows) && rows.length === 1;
    }
  } else {
    const memberships = await getWorkspaceForUser(session.user.id);
    authorised = Boolean(memberships?.some((item: any) => item.workspace_id === workspaceId && item.business_workspaces?.id === workspaceId));
  }

  if (!authorised) return NextResponse.redirect(new URL("/workspace?selection=denied", request.url));

  const response = NextResponse.redirect(new URL("/workspace/finance", request.url));
  response.cookies.set("johden_selected_workspace", workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
