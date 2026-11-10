import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
};

export async function PATCH(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid quotation update." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!UUID.test(id) || !["sent", "accepted", "rejected", "expired"].includes(status)) {
    return NextResponse.json({ error: "Choose a valid quotation and status." }, { status: 400 });
  }

  const existingResponse = await fetch(
    `${ctx.url}/rest/v1/quotes?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,status,valid_until&limit=1`,
    {
      headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` },
      cache: "no-store",
    },
  );
  if (!existingResponse.ok) {
    return NextResponse.json({ error: "Unable to verify quotation." }, { status: 502 });
  }
  const rows = await existingResponse.json();
  const quote = Array.isArray(rows) ? rows[0] : null;
  if (!quote) {
    return NextResponse.json({ error: "Quotation not found in this workspace." }, { status: 404 });
  }
  const current = String(quote.status || "draft").toLowerCase();
  if (!(ALLOWED[current] || []).includes(status)) {
    return NextResponse.json({
      error: current === "converted"
        ? "A converted quotation cannot be changed."
        : `Cannot change a ${current} quotation to ${status}.`,
    }, { status: 409 });
  }

  const updateResponse = await fetch(
    `${ctx.url}/rest/v1/quotes?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&status=eq.${encodeURIComponent(current)}`,
    {
      method: "PATCH",
      headers: {
        apikey: ctx.serviceKey,
        Authorization: `Bearer ${ctx.serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!updateResponse.ok) {
    return NextResponse.json({ error: "Could not update quotation status." }, { status: 502 });
  }
  const updated = await updateResponse.json();
  if (!Array.isArray(updated) || !updated[0]) {
    return NextResponse.json({ error: "The quotation changed. Reload and try again." }, { status: 409 });
  }
  return NextResponse.json({ quote: updated[0] });
}
