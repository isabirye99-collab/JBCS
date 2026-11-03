
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
  return Array.isArray(rows) && rows.length === 1 ? rows[0].id : null;
}

export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json(
      { error: "Finance database configuration is missing." },
      { status: 503 }
    );
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) {
      return NextResponse.json(
        { error: "JBCS workspace not found or inactive." },
        { status: 503 }
      );
    }

    const response = await fetch(
      `${url}/rest/v1/invoices?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=id,invoice_number,contact_id,issue_date,due_date,currency,exchange_rate,subtotal,tax_amount,total,amount_paid,status,notes,created_at,business_contacts(name),document_items(id,description,quantity,unit_price,tax_rate,line_total)&order=created_at.desc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Unable to load invoices." },
        { status: 502 }
      );
    }

    return NextResponse.json({ invoices: await response.json() });
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the finance database." },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url, key } = config();
  if (!url || !key) {
    return NextResponse.json(
      { error: "Finance database configuration is missing." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid invoice details." },
      { status: 400 }
    );
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const contactId = str(body.contact_id, 80);
  const issueDate = str(body.issue_date, 10);
  const dueDate = str(body.due_date, 10);
  const currency = str(body.currency || "UGX", 3).toUpperCase();
  const notes = str(body.notes, 2000);
  const exchangeRate = Number(body.exchange_rate ?? 1);
  const items = body.items;

  if (!contactId) {
    return NextResponse.json(
      { error: "Select a customer for this invoice." },
      { status: 400 }
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contactId)
  ) {
    return NextResponse.json(
      { error: "Invalid customer selection." },
      { status: 400 }
    );
  }

  const validDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

  if (issueDate && !validDate(issueDate)) {
    return NextResponse.json(
      { error: "Invalid invoice issue date." },
      { status: 400 }
    );
  }

  if (dueDate && !validDate(dueDate)) {
    return NextResponse.json(
      { error: "Invalid invoice due date." },
      { status: 400 }
    );
  }

  if (issueDate && dueDate && dueDate < issueDate) {
    return NextResponse.json(
      { error: "The due date cannot be before the issue date." },
      { status: 400 }
    );
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json(
      { error: "Enter a valid three-letter currency code." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    return NextResponse.json(
      { error: "Exchange rate must be greater than zero." },
      { status: 400 }
    );
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    return NextResponse.json(
      { error: "Add between 1 and 100 invoice items." },
      { status: 400 }
    );
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
      return NextResponse.json(
        { error: "Invalid invoice line item." },
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
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(taxRate) ||
      taxRate < 0 ||
      taxRate > 100
    ) {
      return NextResponse.json(
        { error: "Check each item's description, quantity, price and tax rate." },
        { status: 400 }
      );
    }

    const base = Math.round(quantity * unitPrice * 100) / 100;
    const tax = Math.round(base * taxRate) / 100;
    cleanItems.push({
      description,
      quantity,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_total: Math.round((base + tax) * 100) / 100,
    });
  }

  const subtotal = Math.round(
    cleanItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0) * 100
  ) / 100;

  const total = Math.round(
    cleanItems.reduce((sum, item) => sum + item.line_total, 0) * 100
  ) / 100;

  const taxAmount = Math.round((total - subtotal) * 100) / 100;

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) {
      return NextResponse.json(
        { error: "JBCS workspace not found or inactive." },
        { status: 503 }
      );
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
      return NextResponse.json(
        { error: "The selected customer was not found in the JBCS workspace." },
        { status: 400 }
      );
    }

    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = crypto.randomUUID().slice(0, 8).toUpperCase();
    const invoiceNumber = `INV-${datePart}-${randomPart}`;

    const invoiceResponse = await fetch(`${url}/rest/v1/invoices`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
        invoice_number: invoiceNumber,
        contact_id: contactId,
        issue_date: issueDate || now.toISOString().slice(0, 10),
        due_date: dueDate || null,
        currency,
        exchange_rate: exchangeRate,
        subtotal,
        tax_amount: taxAmount,
        total,
        amount_paid: 0,
        status: "draft",
        notes: notes || null,
      }),
      cache: "no-store",
    });

    if (!invoiceResponse.ok) {
      return NextResponse.json(
        { error: "Could not save the invoice. Check the database logs." },
        { status: 502 }
      );
    }

    const invoiceRows = await invoiceResponse.json();
    const invoice = Array.isArray(invoiceRows) ? invoiceRows[0] : null;

    if (!invoice?.id) {
      return NextResponse.json(
        { error: "The saved invoice was not returned." },
        { status: 502 }
      );
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
          document_type: "invoice",
          invoice_id: invoice.id,
          quote_id: null,
        }))
      ),
      cache: "no-store",
    });

    if (!itemResponse.ok) {
      // Remove the incomplete invoice if its line items could not be saved.
      await fetch(
        `${url}/rest/v1/invoices?id=eq.${encodeURIComponent(invoice.id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
        {
          method: "DELETE",
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          cache: "no-store",
        }
      );

      return NextResponse.json(
        { error: "Invoice items could not be saved; the incomplete invoice was rolled back." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { invoice: { ...invoice, document_items: cleanItems } },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to connect to the finance database." },
      { status: 502 }
    );
  }
}
