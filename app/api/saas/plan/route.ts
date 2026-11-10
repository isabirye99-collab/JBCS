import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  return NextResponse.json({
    workspace: { id: ctx.workspaceId, name: ctx.workspaceName },
    plan: {
      key: ctx.planKey,
      name: ctx.planKey === "basic" ? "Basic" : "Pro Accounting",
      billingInterval: "annual",
      status: ctx.subscriptionStatus,
      maxUsers: ctx.maxUsers,
      features: ctx.planFeatures,
      isSuperAdmin: ctx.isSuperAdmin,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
