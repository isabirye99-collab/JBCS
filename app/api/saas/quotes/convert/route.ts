import { NextRequest, NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
  return DATE.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export async function POST(request: NextRequest) {
  const ctx = await getSaasContext();
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid quotation conversion request." }, { status: 400 });
  }

  const quoteId = typeof body.quote_id === "string" ? body.quote_id : "";
  const issueDate = typeof body.issue_date === "string" && body.issue_date.trim()
    ? body.issue_date.trim()
    : new Date().toISOString().slice(0, 10);
  const dueDate = typeof body.due_date === "string" ? body.due_date.trim() : "";

  if (!UUID.test(quoteId)) {
    return NextResponse.json({ error: "Choose a valid quotation." }, { status: 400 });
  }
  if (!validDate(issueDate) || (dueDate && !validDate(dueDate)) || (dueDate && dueDate < issueDate)) {
    return NextResponse.json({ error: "Check the invoice issue date and due date." }, { status: 400 });
  }

  const dateKey = issueDate.replace(/-/g, "");
  const numberResponse = await fetch(
    `${ctx.url}/rest/v1/invoices?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=invoice_number&limit=5000`,
    { headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` }, cache: "no-store" },
  );
  if (!numberResponse.ok) return NextResponse.json({ error: "Unable to generate the invoice number. Please try again." }, { status: 502 });
  const existingNumbers: Array<{ invoice_number?: string | null }> = await numberResponse.json();
  const highestSequence = existingNumbers.reduce((highest, row) => {
    const match = String(row.invoice_number || "").match(new RegExp(`^I${dateKey}-(\\d+)$`, "i"));
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  const invoiceNumber = `I${dateKey}-${String(highestSequence + 1).padStart(3, "0")}`;
  const rpc = await fetch(`${ctx.url}/rest/v1/rpc/convert_workspace_quote_to_invoice`, {
    method: "POST",
    headers: {
      apikey: ctx.serviceKey,
      Authorization: `Bearer ${ctx.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_workspace_id: ctx.workspaceId,
      p_created_by: ctx.session.user.id,
      p_quote_id: quoteId,
      p_invoice_number: invoiceNumber,
      p_issue_date: issueDate,
      p_due_date: dueDate || null,
    }),
    cache: "no-store",
  });

  if (!rpc.ok) {
    let details = "";
    try {
      const errorBody = await rpc.json();
      details = String(errorBody?.message || errorBody?.details || "");
    } catch {}
    if (details.includes("already been converted") || details.includes("already linked") || details.includes("Only accepted")) {
      return NextResponse.json({ error: details || "Only accepted, unconverted quotations can be converted." }, { status: 409 });
    }
    if (details.includes("not found")) {
      return NextResponse.json({ error: details }, { status: 404 });
    }
    if (details.includes("Due date") || details.includes("issue date") || details.includes("line items") || details.includes("customer") || details.includes("authorized")) {
      return NextResponse.json({ error: details }, { status: 400 });
    }
    return NextResponse.json({
      error: details || "Quotation conversion failed. The database transaction was rolled back.",
    }, { status: 502 });
  }

  const result = await rpc.json();
  if (!result?.invoice?.id || !Array.isArray(result?.document_items)) {
    return NextResponse.json({ error: "Invoice creation could not be confirmed." }, { status: 502 });
  }

  return NextResponse.json({
    invoice: result.invoice,
    document_items: result.document_items,
    converted_quote_id: result.converted_quote_id,
  }, { status: 201 });
}
