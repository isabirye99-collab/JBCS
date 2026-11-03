import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

export async function POST(request: import("next/server").NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Choose an invoice to issue." }, { status: 400 }); }
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
  }

  const headers = { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` };
  const url = `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,status,total&limit=1`;
  const existing = await fetch(url, { headers, cache: "no-store" });
  if (!existing.ok) return NextResponse.json({ error: "Unable to verify invoice." }, { status: 502 });
  const rows = await existing.json();
  if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Invoice not found in this workspace." }, { status: 404 });
  if (rows[0].status !== "draft") return NextResponse.json({ error: "Only draft invoices can be issued." }, { status: 409 });
  if (!Number.isFinite(Number(rows[0].total)) || Number(rows[0].total) <= 0) {
    return NextResponse.json({ error: "Add a positive invoice total before issuing this invoice." }, { status: 400 });
  }

  const issued = await fetch(
    `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&status=eq.draft&total=gt.0`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ status: "sent", updated_at: new Date().toISOString() }),
      cache: "no-store",
    },
  );
  if (!issued.ok) return NextResponse.json({ error: "Could not issue invoice." }, { status: 502 });
  const updated = await issued.json();
  if (!Array.isArray(updated) || !updated[0]) {
    return NextResponse.json({ error: "Invoice changed before it could be issued. Reload and try again." }, { status: 409 });
  }
  return NextResponse.json({ invoice: updated[0] });
}
