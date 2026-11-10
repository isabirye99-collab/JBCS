
import { NextResponse } from "next/server";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;

const todayInUganda = () => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const getHeaders = (serviceKey: string) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
});

export async function GET() {
  try {
    const ctx = await getSaasContext();

    if ("error" in ctx) {
      return NextResponse.json(
        { error: ctx.error },
        { status: ctx.status }
      );
    }

    const url =
      `${ctx.url}/rest/v1/invoices` +
      `?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}` +
      "&select=id,invoice_number,contact_id,issue_date,due_date,currency,subtotal,tax_amount,total,amount_paid,status,notes,created_at,business_contacts(name),document_items(id,description,quantity,unit_price,tax_rate,line_total)" +
      "&order=issue_date.desc&limit=5000";

    const response = await fetch(url, {
      headers: getHeaders(ctx.serviceKey),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[Invoices GET] Failed to load invoices:", {
        status: response.status,
      });

      return NextResponse.json(
        { error: "Unable to load invoices." },
        { status: 502 }
      );
    }

    const invoices = await response.json();

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[Invoices GET] Unexpected error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while loading invoices." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: import("next/server").NextRequest
) {
  try {
    const ctx = await getSaasContext();

    if ("error" in ctx) {
      return NextResponse.json(
        { error: ctx.error },
        { status: ctx.status }
      );
    }

    let body: Record<string, unknown>;

    try {
      const parsed: unknown = await request.json();

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          { error: "Enter valid invoice details." },
          { status: 400 }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Enter valid invoice details." },
        { status: 400 }
      );
    }

    const contactId = str(body.contact_id, 64);
    const issueDate =
      str(body.issue_date, 10) ||
      todayInUganda();
    const dueDate = str(body.due_date, 10);
    const currency = str(body.currency || "UGX", 3).toUpperCase();
    const notes = str(body.notes, 2000);
    const items = body.items;

    if (!UUID_REGEX.test(contactId)) {
      return NextResponse.json(
        { error: "Choose a valid customer." },
        { status: 400 }
      );
    }

    if (
      !validDate(issueDate) ||
      (dueDate && !validDate(dueDate)) ||
      (dueDate && dueDate < issueDate)
    ) {
      return NextResponse.json(
        { error: "Check the invoice and due dates." },
        { status: 400 }
      );
    }

    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json(
        { error: "Use a valid three-letter invoice currency." },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(items) ||
      items.length < 1 ||
      items.length > 100
    ) {
      return NextResponse.json(
        { error: "Add between 1 and 100 invoice items." },
        { status: 400 }
      );
    }

    const cleanItems: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      line_total: number;
    }> = [];

    for (const raw of items) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return NextResponse.json(
          { error: "Invalid invoice item." },
          { status: 400 }
        );
      }

      const item = raw as Record<string, unknown>;
      const description = str(item.description, 500);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const taxRate = Number(item.tax_rate ?? 0);

      if (
        !description ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 1000000 ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0 ||
        unitPrice > 1e12 ||
        !Number.isFinite(taxRate) ||
        taxRate < 0 ||
        taxRate > 100
      ) {
        return NextResponse.json(
          {
            error:
              "Check item description, quantity, price and tax.",
          },
          { status: 400 }
        );
      }

      const base = Math.round(quantity * unitPrice * 100) / 100;
      const tax = Math.round(base * taxRate) / 100;
      const lineTotal = Math.round((base + tax) * 100) / 100;

      if (
        ![base, tax, lineTotal].every(Number.isFinite) ||
        lineTotal > 9e15
      ) {
        return NextResponse.json(
          { error: "An invoice item amount is too large." },
          { status: 400 }
        );
      }

      cleanItems.push({
        description,
        quantity,
        unit_price: unitPrice,
        tax_rate: taxRate,
        line_total: lineTotal,
      });
    }

    // New invoices use the requested JBCS I sequence. Existing numbers are preserved.
    const numberResponse = await fetch(
      `${ctx.url}/rest/v1/invoices?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=invoice_number&limit=5000`,
      { headers: getHeaders(ctx.serviceKey), cache: "no-store" },
    );
    if (!numberResponse.ok) {
      console.error("[Invoices POST] Could not determine next invoice number:", { status: numberResponse.status });
      return NextResponse.json({ error: "Unable to generate the next invoice number. Please try again." }, { status: 502 });
    }
    const existingNumbers: Array<{ invoice_number?: string | null }> = await numberResponse.json();
    const highestSequence = existingNumbers.reduce((highest, row) => {
      const match = String(row.invoice_number || "").match(/^JBCS\s*I\s*(\d+)$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    const invoiceNumber = `JBCS I ${String(highestSequence + 1).padStart(4, "0")}`;
    const rpc = await fetch(
      `${ctx.url}/rest/v1/rpc/create_workspace_invoice`,
      {
        method: "POST",
        headers: {
          ...getHeaders(ctx.serviceKey),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_workspace_id: ctx.workspaceId,
          p_created_by: ctx.session.user.id,
          p_contact_id: contactId,
          p_invoice_number: invoiceNumber,
          p_issue_date: issueDate,
          p_due_date: dueDate || null,
          p_currency: currency,
          p_notes: notes || null,
          p_items: cleanItems.map(
            ({ description, quantity, unit_price, tax_rate }) => ({
              description,
              quantity,
              unit_price,
              tax_rate,
            })
          ),
        }),
        cache: "no-store",
      }
    );

    if (!rpc.ok) {
      const rpcError = await rpc.text().catch(() => "");

      // Diagnostic information stays in the server terminal.
      // Do not expose raw database errors to the browser.
      console.error("[Invoice Creation Diagnostic]", {
        status: rpc.status,
        databaseError: rpcError.slice(0, 1500),
      });

      if (rpc.status === 400 || rpc.status === 404) {
        return NextResponse.json(
          {
            error:
              "Invoice details were rejected. Confirm the customer and item values, then try again.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Could not create invoice atomically. No partial invoice was saved.",
        },
        { status: 502 }
      );
    }

    let result: {
      invoice?: { id?: string };
      document_items?: unknown[];
    };

    try {
      result = await rpc.json();
    } catch {
      console.error(
        "[Invoice Creation Diagnostic] RPC returned an invalid response."
      );

      return NextResponse.json(
        { error: "Invoice creation could not be confirmed." },
        { status: 502 }
      );
    }

    if (
      !result?.invoice?.id ||
      !Array.isArray(result?.document_items)
    ) {
      console.error(
        "[Invoice Creation Diagnostic] RPC response did not contain the expected invoice and items."
      );

      return NextResponse.json(
        { error: "Invoice creation could not be confirmed." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        invoice: {
          ...result.invoice,
          document_items: result.document_items,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Invoice POST] Unexpected error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while creating the invoice." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: import("next/server").NextRequest) {
  try {
    const ctx = await getSaasContext();
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Enter valid invoice details." }, { status: 400 }); }

    const id = str(body.id, 64);
    const contactId = str(body.contact_id, 64);
    const issueDate = str(body.issue_date, 10);
    const dueDate = str(body.due_date, 10);
    const currency = str(body.currency || "UGX", 3).toUpperCase();
    const notes = str(body.notes, 2000);
    const items = body.items;

    if (!UUID_REGEX.test(id) || !UUID_REGEX.test(contactId)) return NextResponse.json({ error: "Choose a valid draft invoice and customer." }, { status: 400 });
    if (!validDate(issueDate) || (dueDate && !validDate(dueDate)) || (dueDate && dueDate < issueDate)) return NextResponse.json({ error: "Check the invoice and due dates." }, { status: 400 });
    if (!/^[A-Z]{3}$/.test(currency)) return NextResponse.json({ error: "Use a valid three-letter invoice currency." }, { status: 400 });
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) return NextResponse.json({ error: "Add between 1 and 100 invoice items." }, { status: 400 });

    const cleanItems: Array<{ description: string; quantity: number; unit_price: number; tax_rate: number }> = [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") return NextResponse.json({ error: "Invalid invoice item." }, { status: 400 });
      const item = raw as Record<string, unknown>;
      const description = str(item.description, 500);
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unit_price);
      const taxRate = Number(item.tax_rate ?? 0);
      if (!description || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1e12 || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return NextResponse.json({ error: "Check item description, quantity, price and tax." }, { status: 400 });
      cleanItems.push({ description, quantity, unit_price: unitPrice, tax_rate: taxRate });
    }

    const rpc = await fetch(`${ctx.url}/rest/v1/rpc/update_workspace_invoice`, {
      method: "POST",
      headers: { ...getHeaders(ctx.serviceKey), "Content-Type": "application/json" },
      body: JSON.stringify({
        p_workspace_id: ctx.workspaceId,
        p_user_id: ctx.session.user.id,
        p_invoice_id: id,
        p_contact_id: contactId,
        p_issue_date: issueDate,
        p_due_date: dueDate || null,
        p_currency: currency,
        p_notes: notes || null,
        p_items: cleanItems,
      }),
      cache: "no-store",
    });
    if (!rpc.ok) {
      const detail = await rpc.text().catch(() => "");
      console.error("[Invoices PATCH] Atomic update failed:", { status: rpc.status, detail: detail.slice(0, 500) });
      if (rpc.status === 400 || rpc.status === 404) return NextResponse.json({ error: "The draft could not be updated. Confirm the customer, invoice status and line items, then try again." }, { status: 409 });
      return NextResponse.json({ error: "Could not save invoice changes atomically. No partial invoice update was applied." }, { status: 502 });
    }
    const result = await rpc.json();
    if (!result?.invoice?.id || !Array.isArray(result?.document_items)) return NextResponse.json({ error: "Invoice update could not be confirmed." }, { status: 502 });
    return NextResponse.json({ invoice: { ...result.invoice, document_items: result.document_items } });
  } catch (error) {
    console.error("[Invoices PATCH] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while updating the draft invoice." }, { status: 500 });
  }
}

export async function DELETE(request: import("next/server").NextRequest) {
  try {
    const ctx = await getSaasContext();
    if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

    let body: Record<string, unknown>;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "Choose a draft invoice to delete." }, { status: 400 }); }

    const id = str(body.id, 64);
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Choose a valid invoice." }, { status: 400 });
    }

    const headers = getHeaders(ctx.serviceKey);
    const invoiceUrl =
      `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}` +
      `&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,status&limit=1`;
    const existing = await fetch(invoiceUrl, { headers, cache: "no-store" });
    if (!existing.ok) return NextResponse.json({ error: "Unable to verify invoice." }, { status: 502 });
    const rows = await existing.json();
    if (!Array.isArray(rows) || !rows[0]) return NextResponse.json({ error: "Invoice not found in this workspace." }, { status: 404 });
    if (rows[0].status !== "draft") {
      return NextResponse.json({ error: "Only draft invoices can be deleted. Issued invoices are retained for audit history." }, { status: 409 });
    }

    const deleted = await fetch(
      `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&status=eq.draft`,
      {
        method: "DELETE",
        headers: { ...headers, Prefer: "return=representation" },
        cache: "no-store",
      },
    );
    if (!deleted.ok) {
      console.error("[Invoices DELETE] Draft deletion failed:", deleted.status);
      return NextResponse.json({ error: "Draft invoice could not be deleted. It may have linked records." }, { status: 502 });
    }
    const removed = await deleted.json();
    if (!Array.isArray(removed) || !removed[0]) {
      return NextResponse.json({ error: "Invoice changed or is no longer a draft. Reload and try again." }, { status: 409 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("[Invoices DELETE] Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected error occurred while deleting the draft invoice." }, { status: 500 });
  }
}
