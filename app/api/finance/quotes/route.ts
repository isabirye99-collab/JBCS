
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function config() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

async function getWorkspaceId(url: string, key: string) {
  const response = await fetch(
    `${url}/rest/v1/business_workspaces?slug=eq.jbcs&is_active=eq.true&select=id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    }
  );

  if (!response.ok) return null;

  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1
    ? rows[0].id
    : null;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return error("Unauthorised", 401);
  }

  const { url, key } = config();

  if (!url || !key) {
    return error("Finance database configuration is missing.", 503);
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);

    if (!workspaceId) {
      return error("JBCS workspace not found or inactive.", 503);
    }

    const response = await fetch(
      `${url}/rest/v1/quotes?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=id,quote_number,contact_id,issue_date,valid_until,currency,exchange_rate,subtotal,tax_amount,total,status,notes,created_at,business_contacts(name),document_items(id,description,quantity,unit_price,tax_rate,line_total)&order=created_at.desc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return error("Unable to load quotations.", 502);
    }

    return NextResponse.json({ quotes: await response.json() });
  } catch {
    return error("Unable to connect to the finance database.", 502);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return error("Unauthorised", 401);
  }

  const { url, key } = config();

  if (!url || !key) {
    return error("Finance database configuration is missing.", 503);
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return error("Invalid quotation details.", 400);
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const contactId = str(body.contact_id, 80);
  const issueDate = str(body.issue_date, 10);
  const validUntil = str(body.valid_until, 10);
  const currency = str(body.currency || "UGX", 3).toUpperCase();
  const notes = str(body.notes, 2000);
  const exchangeRate = Number(body.exchange_rate ?? 1);
  const items = body.items;

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

  if (!contactId || !isUuid(contactId)) {
    return error("Select a valid customer for this quotation.", 400);
  }

  if (issueDate && !validDate(issueDate)) {
    return error("Invalid quotation issue date.", 400);
  }

  if (validUntil && !validDate(validUntil)) {
    return error("Invalid quotation validity date.", 400);
  }

  if (validUntil && validUntil < (issueDate || new Date().toISOString().slice(0, 10))) {
    return error("The validity date cannot be before the issue date.", 400);
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return error("Enter a valid three-letter currency code.", 400);
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 999_999_999_999) {
    return error("Exchange rate must be greater than zero.", 400);
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return error("Add between 1 and 100 quotation items.", 400);
  }

  const cleanItems: {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    line_total: number;
  }[] = [];

  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      return error("Invalid quotation line item.", 400);
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
      quantity > 1_000_000_000 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      unitPrice > 1_000_000_000_000 ||
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      return error(
        "Check each item's description, quantity, price and tax rate.",
        400
      );
    }

    const base = Math.round(quantity * unitPrice * 100) / 100;
    const tax = Math.round(base * taxRate) / 100;

    if (
      !Number.isFinite(base) ||
      !Number.isFinite(tax) ||
      !Number.isFinite(base + tax) ||
      base + tax > 9_999_999_999_999_999.99
    ) {
      return error("A quotation item amount is too large.", 400);
    }

    cleanItems.push({
      description,
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_total: Math.round((base + tax) * 100) / 100,
    });
  }

  const subtotal =
    Math.round(
      cleanItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) * 100
    ) / 100;

  const total =
    Math.round(
      cleanItems.reduce((sum, item) => sum + item.line_total, 0) * 100
    ) / 100;

  const taxAmount = Math.round((total - subtotal) * 100) / 100;

  if (
    ![subtotal, total, taxAmount].every(Number.isFinite) ||
    subtotal > 9_999_999_999_999_999.99 ||
    total > 9_999_999_999_999_999.99 ||
    taxAmount > 9_999_999_999_999_999.99
  ) {
    return error("The quotation total is too large.", 400);
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);

    if (!workspaceId) {
      return error("JBCS workspace not found or inactive.", 503);
    }

    const customerResponse = await fetch(
      `${url}/rest/v1/business_contacts?id=eq.${encodeURIComponent(contactId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&contact_type=eq.client&select=id&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    const customers = customerResponse.ok
      ? await customerResponse.json()
      : null;

    if (!Array.isArray(customers) || customers.length !== 1) {
      return error(
        "The selected customer was not found in the JBCS workspace.",
        400
      );
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const quoteNumber =
      `QUO-${datePart}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const quoteResponse = await fetch(`${url}/rest/v1/quotes`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        quote_number: quoteNumber,
        contact_id: contactId,
        issue_date: issueDate || now.toISOString().slice(0, 10),
        valid_until: validUntil || null,
        currency,
        exchange_rate: exchangeRate,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: "draft",
        notes: notes || null,
      }),
      cache: "no-store",
    });

    if (!quoteResponse.ok) {
      return error("Could not save the quotation. Check the database configuration.", 502);
    }

    const quoteRows = await quoteResponse.json();
    const quote = Array.isArray(quoteRows) ? quoteRows[0] : null;

    if (!quote?.id) {
      return error("The saved quotation was not returned.", 502);
    }

    const itemResponse = await fetch(`${url}/rest/v1/document_items`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(
        cleanItems.map((item) => ({
          ...item,
          workspace_id: workspaceId,
          document_type: "quote",
          quote_id: quote.id,
          invoice_id: null,
        }))
      ),
      cache: "no-store",
    });

    if (!itemResponse.ok) {
      await fetch(
        `${url}/rest/v1/quotes?id=eq.${encodeURIComponent(quote.id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
        {
          method: "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: "no-store",
        }
      );

      return error(
        "Quotation items could not be saved; the incomplete quotation was rolled back.",
        502
      );
    }

    return NextResponse.json(
      { quote: { ...quote, document_items: cleanItems } },
      { status: 201 }
    );
  } catch {
    return error("Unable to connect to the finance database.", 502);
  }
}
