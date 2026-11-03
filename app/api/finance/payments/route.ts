
import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function config() {
  return {
    url: process.env.SUPABASE_URL?.replace(/\/+$/, ""),
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);

  const { url, key } = config();
  if (!url || !key) return fail("Finance database configuration is missing.", 503);

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) return fail("JBCS workspace not found or inactive.", 503);

    const params = new URLSearchParams({
      workspace_id: `eq.${workspaceId}`,
      select:
        "id,invoice_id,payment_reference,payment_date,amount,currency,exchange_rate,method,notes,created_at,invoices(invoice_number,total,amount_paid,status,business_contacts(name))",
      order: "payment_date.desc,created_at.desc",
    });

    const response = await fetch(`${url}/rest/v1/payments?${params}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    if (!response.ok) return fail("Unable to load payments.", 502);

    return NextResponse.json({ payments: await response.json() });
  } catch {
    return fail("Unable to connect to the finance database.", 502);
  }
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin())) return fail("Unauthorised", 401);

  const { url, key } = config();
  if (!url || !key) return fail("Finance database configuration is missing.", 503);

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return fail("Invalid payment details.");
  }

  const str = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  const invoiceId = str(body.invoice_id, 36);
  const paymentDate = str(body.payment_date, 10);
  const amount = Number(body.amount);
  const exchangeRate = Number(body.exchange_rate ?? 1);
  const method = str(body.method || "other", 30);
  const reference = str(body.payment_reference, 100);
  const notes = str(body.notes, 2000);

  const allowedMethods = [
    "cash",
    "bank_transfer",
    "mobile_money",
    "card",
    "cheque",
    "other",
  ];

  const validPaymentDate =
    /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) &&
    !Number.isNaN(Date.parse(`${paymentDate}T00:00:00Z`)) &&
    new Date(`${paymentDate}T00:00:00Z`).toISOString().slice(0, 10) === paymentDate;

  if (
    !/^[0-9a-f-]{36}$/i.test(invoiceId) ||
    !validPaymentDate ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 9_999_999_999_999_999 ||
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    exchangeRate > 999_999_999_999 ||
    !allowedMethods.includes(method)
  ) {
    return fail("Enter a valid invoice, date, amount, exchange rate and payment method.");
  }

  try {
    const workspaceId = await getWorkspaceId(url, key);
    if (!workspaceId) return fail("JBCS workspace not found or inactive.", 503);

    const invoiceResponse = await fetch(
      `${url}/rest/v1/invoices?id=eq.${encodeURIComponent(invoiceId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=id,invoice_number,total,amount_paid,status,currency,exchange_rate&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    if (!invoiceResponse.ok) return fail("Unable to validate the invoice.", 502);

    const invoices = await invoiceResponse.json();
    if (!Array.isArray(invoices) || invoices.length !== 1) {
      return fail("Invoice not found in this workspace.", 404);
    }

    const invoice = invoices[0];

    if (invoice.status === "void") {
      return fail("Payments cannot be recorded against a void invoice.");
    }

    const total = Number(invoice.total);
    const amountPaid = Number(invoice.amount_paid || 0);
    const outstanding = Math.round((total - amountPaid) * 100) / 100;

    if (!Number.isFinite(total) || total <= 0 || outstanding <= 0) {
      return fail("This invoice has no outstanding balance.");
    }

    if (amount > outstanding + 0.000001) {
      return fail(
        `Payment exceeds the outstanding balance of ${outstanding.toFixed(2)} ${invoice.currency}.`
      );
    }

    const currency = String(invoice.currency || "UGX").toUpperCase();
    const newAmountPaid = Math.round((amountPaid + amount) * 100) / 100;
    const newStatus = newAmountPaid >= total - 0.000001 ? "paid" : "part_paid";

    const paymentPayload = {
      workspace_id: workspaceId,
      invoice_id: invoice.id,
      payment_reference: reference || null,
      payment_date: paymentDate,
      amount,
      currency,
      exchange_rate: exchangeRate,
      method,
      notes: notes || null,
    };

    const paymentResponse = await fetch(
      `${url}/rest/v1/payments?select=*`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(paymentPayload),
        cache: "no-store",
      }
    );

    if (!paymentResponse.ok) {
      const details = await paymentResponse.text();
      console.error("Payment creation failed:", paymentResponse.status, details);
      return fail("Unable to save the payment.", 502);
    }

    const createdPayments = await paymentResponse.json();
    const payment = Array.isArray(createdPayments) ? createdPayments[0] : null;

    if (!payment?.id) {
      return fail("The payment could not be confirmed as saved.", 502);
    }

    const updateResponse = await fetch(
      `${url}/rest/v1/invoices?id=eq.${encodeURIComponent(invoice.id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&amount_paid=eq.${encodeURIComponent(String(amountPaid))}`,
      {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          amount_paid: newAmountPaid,
          status: newStatus,
        }),
        cache: "no-store",
      }
    );

    const updatedInvoices = updateResponse.ok
      ? await updateResponse.json()
      : [];

    if (!updateResponse.ok || !Array.isArray(updatedInvoices) || updatedInvoices.length !== 1) {
      // Compensate if the invoice update fails.
      // A production-grade atomic database transaction is still recommended.
      await fetch(
        `${url}/rest/v1/payments?id=eq.${encodeURIComponent(payment.id)}&workspace_id=eq.${encodeURIComponent(workspaceId)}`,
        {
          method: "DELETE",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
          cache: "no-store",
        }
      );

      return fail(
        "The invoice balance could not be updated. The payment was rolled back; please retry.",
        409
      );
    }

    return NextResponse.json(
      {
        payment,
        invoice: updatedInvoices[0],
        outstanding: Math.round((total - newAmountPaid) * 100) / 100,
      },
      { status: 201 }
    );
  } catch {
    return fail("Unable to connect to the finance database.", 502);
  }
}
