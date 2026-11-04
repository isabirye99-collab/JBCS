import { NextRequest, NextResponse } from "next/server";
import { getSaasSession, getWorkspaceForUser } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getSaasSession();
  if (!session) return NextResponse.redirect(new URL("/login", request.url));

  const form = await request.formData();
  const workspaceId = String(form.get("workspace_id") || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
    return NextResponse.redirect(new URL("/workspace?selection=invalid", request.url));
  }

  const memberships = await getWorkspaceForUser(session.user.id);
  const membership = memberships?.find((item: any) => item.workspace_id === workspaceId && item.business_workspaces?.id === workspaceId);
  if (!membership) return NextResponse.redirect(new URL("/workspace?selection=denied", request.url));

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
