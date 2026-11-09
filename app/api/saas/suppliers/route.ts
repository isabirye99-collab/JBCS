
import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await getSaasContext();

  if ("error" in ctx) {
    return NextResponse.json(
      { error: ctx.error },
      { status: ctx.status }
    );
  }

  const url = new URL(
    `${ctx.url}/rest/v1/business_contacts`
  );

  url.searchParams.set(
    "workspace_id",
    `eq.${ctx.workspaceId}`
  );

  url.searchParams.set(
    "or",
    "(contact_type.eq.supplier,is_supplier.eq.true)"
  );

  url.searchParams.set(
    "select",
    "id,name,email,phone,contact_type,is_supplier"
  );

  url.searchParams.set("order", "name.asc");
  url.searchParams.set("limit", "500");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to load suppliers." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    suppliers: await response.json(),
  });
}
