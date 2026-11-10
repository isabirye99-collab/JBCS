
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSaasContext } from "@/lib/saas-context";

export const dynamic = "force-dynamic";

type Branding = Record<string, any>;

export default async function PrintableInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getSaasContext();

  if ("error" in ctx) redirect("/login");

  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    notFound();
  }

  const headers = {
    apikey: ctx.serviceKey,
    Authorization: `Bearer ${ctx.serviceKey}`,
  };

  const response = await fetch(
    `${ctx.url}/rest/v1/invoices?id=eq.${encodeURIComponent(id)}&workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&select=id,invoice_number,issue_date,due_date,currency,subtotal,tax_amount,total,amount_paid,status,notes,branding_snapshot,business_contacts(name,email,address,tax_number),document_items(description,quantity,unit_price,tax_rate,line_total)&limit=1`,
    {
      headers,
      cache: "no-store",
    },
  );

  if (!response.ok) notFound();

  const rows = await response.json();
  const invoice = Array.isArray(rows) ? rows[0] : null;

  if (!invoice) notFound();

  // Use the invoice's saved branding when available.
  let branding: Branding | null =
    invoice.branding_snapshot &&
    typeof invoice.branding_snapshot === "object" &&
    !Array.isArray(invoice.branding_snapshot)
      ? { ...invoice.branding_snapshot }
      : null;

  // Load workspace branding if the invoice has no saved snapshot.
  if (!branding) {
    const brandingResponse = await fetch(
      `${ctx.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&product_key=eq.billing&select=*&limit=1`,
      {
        headers,
        cache: "no-store",
      },
    );

    const brandingRows = brandingResponse.ok
      ? await brandingResponse.json()
      : [];

    branding =
      Array.isArray(brandingRows) && brandingRows[0]
        ? { ...brandingRows[0] }
        : {};
  }

  // Apply the default JBCS invoice branding.
  branding = {
    company_name: ctx.workspaceName,
    primary_color: "#9f1d35",
    secondary_color: "#d97736",
    font_family: "Arial",
    template_style: "modern",
    logo_position: "left",
    footer_text: "Thank you for your business.",
    ...branding,
    logo_url: branding?.logo_url || "/johden-logo.svg",
  };

  // Load current bank details independently so older invoice snapshots
  // can also display bank details configured in Workspace Settings.
  // If the migration has not been applied, the invoice still renders.
  const bankFields = [
    "bank_name",
    "bank_account_name",
    "bank_account_number",
    "bank_branch",
    "bank_currency",
    "bank_swift_code",
    "payment_instructions",
  ];

  try {
    const bankResponse = await fetch(
      `${ctx.url}/rest/v1/workspace_document_branding?workspace_id=eq.${encodeURIComponent(ctx.workspaceId)}&product_key=eq.billing&select=${bankFields.join(",")}&limit=1`,
      {
        headers,
        cache: "no-store",
      },
    );

    if (bankResponse.ok) {
      const bankRows = await bankResponse.json();
      const liveBankSettings =
        Array.isArray(bankRows) && bankRows[0]
          ? bankRows[0]
          : {};

      for (const field of bankFields) {
        if (
          (branding[field] === undefined ||
            branding[field] === null ||
            branding[field] === "") &&
          liveBankSettings[field] !== undefined &&
          liveBankSettings[field] !== null &&
          liveBankSettings[field] !== ""
        ) {
          branding[field] = liveBankSettings[field];
        }
      }
    }
  } catch {
    // Keep the invoice printable if bank settings cannot be loaded.
  }

  const primaryColor = /^#[0-9a-f]{6}$/i.test(
    String(branding.primary_color),
  )
    ? String(branding.primary_color)
    : "#9f1d35";

  const secondaryColor = /^#[0-9a-f]{6}$/i.test(
    String(branding.secondary_color),
  )
    ? String(branding.secondary_color)
    : "#d97736";

  const fontFamily = [
    "Arial",
    "Inter",
    "Georgia",
    "Verdana",
    "Tahoma",
  ].includes(String(branding.font_family))
    ? String(branding.font_family)
    : "Arial";

  const money = (value: number) =>
    new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: invoice.currency || "UGX",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const balanceDue = Math.max(
    0,
    Number(invoice.total || 0) - Number(invoice.amount_paid || 0),
  );

  const bankDetails = [
    { label: "Bank", value: branding.bank_name },
    { label: "Account Name", value: branding.bank_account_name },
    { label: "Account Number", value: branding.bank_account_number },
    { label: "Branch", value: branding.bank_branch },
    { label: "Currency", value: branding.bank_currency || "UGX" },
    { label: "SWIFT Code", value: branding.bank_swift_code },
  ].filter(
    (item) =>
      item.value !== undefined &&
      item.value !== null &&
      String(item.value).trim() !== "",
  );

  const hasBankDetails =
    bankDetails.length > 0 ||
    Boolean(
      branding.payment_instructions &&
        String(branding.payment_instructions).trim(),
    );

  const printableName = String(invoice.invoice_number || `JBCS-I-${invoice.id.slice(0, 8).toUpperCase()}`).trim().replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-");

  return (
    <>
    <title>{printableName}</title>
    <main
      className="invoice-print-page"
      data-template-style={String(branding.template_style)}
      style={{
        maxWidth: 900,
        margin: "32px auto",
        padding: "clamp(22px,5vw,48px)",
        color: "#29252a",
        background: "#fff",
        fontFamily,
        boxShadow: "0 16px 50px #29252a12",
        borderRadius: 12,
        minHeight: "80vh",
      }}
    >
      <style>{`
        body {
          background: #f3f4f6;
        }

        .invoice-print-page {
          position: relative;
          overflow: hidden;
        }

        .invoice-print-page:before {
          content: "";
          display: block;
          height: 7px;
          background: linear-gradient(
            90deg,
            ${primaryColor} 0 72%,
            ${secondaryColor} 72% 100%
          );
          position: absolute;
          inset: 0 0 auto;
        }

        .invoice-print-page h1 {
          font-size: 34px;
          letter-spacing: .08em;
          color: ${primaryColor};
        }

        .invoice-print-page table {
          margin-top: 22px;
        }

        .invoice-print-page table th {
          background: #292629;
          color: #fff;
          font-size: 11px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .invoice-print-page table td {
          font-size: 13px;
        }

        .invoice-print-page header p {
          font-size: 13px;
          color: #625b62;
          margin: 7px 0;
        }

        .invoice-print-page footer {
          color: #77717a;
        }

        .invoice-print-page[data-template-style="classic"] h1 {
          font-family: Georgia, serif;
          letter-spacing: .12em;
        }

        .invoice-print-page[data-template-style="classic"] .invoice-total-box {
          border-radius: 0;
        }

        .invoice-print-page[data-template-style="minimal"] .invoice-print-meta section {
          background: #fff;
          border-radius: 0;
        }

        .invoice-print-page[data-template-style="formal"] table th {
          background: ${primaryColor};
        }

        .invoice-print-page[data-template-style="formal"] .invoice-print-meta section {
          border-radius: 0;
        }

        .invoice-print-page .invoice-print-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 26px 0;
        }

        .invoice-print-page .invoice-print-meta section {
          padding: 18px;
          background: #faf9fa;
          border: 1px solid #eee9ec;
          border-radius: 8px;
        }

        .invoice-print-page .invoice-print-meta strong {
          font-size: 10px;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #8b8189;
        }

        .invoice-print-page .invoice-print-meta p {
          margin: 6px 0;
          font-size: 13px;
          background: transparent !important;
          color: #3f3540;
        }

        .invoice-print-page .invoice-print-meta strong {
          background: transparent !important;
        }

        .invoice-print-page .invoice-bank-details th {
          background: #fbf6f7 !important;
          color: #6f5961 !important;
        }

        .invoice-print-page .invoice-total-box {
          padding: 16px 18px;
          background: ${primaryColor}0d;
          border: 1px solid ${primaryColor}35;
          border-radius: 9px;
        }

        .invoice-print-page .invoice-total-box p {
          margin: 8px 0;
        }

        .invoice-print-page .invoice-total-box p:last-child {
          font-size: 18px;
          color: ${primaryColor};
          border-top: 1px solid #efd7da;
          padding-top: 12px;
          margin-top: 12px;
        }

        .invoice-summary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 330px);
          gap: 20px;
          align-items: start;
          margin-top: 24px;
        }

        .invoice-bank-details table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .invoice-bank-details th,
        .invoice-bank-details td {
          padding: 9px 10px;
          border-bottom: 1px solid #eadfe3;
          text-align: left;
          overflow-wrap: anywhere;
        }

        .invoice-bank-details th {
          width: 38%;
          color: #6f5961;
          font-weight: 600;
          background: #fbf6f7;
        }

        .invoice-bank-details p {
          margin: 12px 0 0;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        @media (max-width: 700px) {
          .invoice-summary-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          body {
            background: #fff !important;
          }

          main {
            padding: 12mm !important;
            margin: 0 !important;
            max-width: none !important;
            min-height: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          thead {
            display: table-header-group;
          }

          tr {
            break-inside: avoid;
          }

          .invoice-bank-details {
            break-inside: avoid;
          }
        }

        @media (max-width: 600px) {
          .invoice-print-page .invoice-print-meta {
            grid-template-columns: 1fr;
          }
        }

        @page {
          size: auto;
          margin: 10mm;
        }
      `}</style>

      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <span style={{ fontSize: 13, color: "#625b62" }}>
          To print or save as PDF, use your browser menu or press Ctrl+P.
        </span>
        <Link href="/workspace/finance">Back to finance</Link>
      </div>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          borderBottom: `2px solid ${primaryColor}`,
          paddingBottom: 24,
          alignItems: "start",
        }}
      >
        <div
          style={{
            textAlign:
              branding.logo_position === "center"
                ? "center"
                : branding.logo_position === "right"
                  ? "right"
                  : "left",
            maxWidth: "65%",
          }}
        >
          {branding.logo_url && (
            <img
              src={String(branding.logo_url)}
              alt={`${branding.company_name} logo`}
              style={{
                display: "block",
                maxWidth: 150,
                maxHeight: 82,
                objectFit: "contain",
                marginBottom: 12,
                marginLeft:
                  branding.logo_position === "center" ||
                  branding.logo_position === "right"
                    ? "auto"
                    : 0,
                marginRight:
                  branding.logo_position === "center" ||
                  branding.logo_position === "right"
                    ? "0"
                    : "auto",
              }}
            />
          )}

          <h1 style={{ margin: "0 0 8px" }}>INVOICE</h1>

          {branding.legal_name &&
            String(branding.legal_name).trim().toLowerCase() !==
              String(branding.company_name || ctx.workspaceName).trim().toLowerCase() && (
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{branding.legal_name}</p>
            )}

          {[
            branding.address,
            branding.phone,
            branding.email,
            branding.website,
            branding.registration_number
              ? `Registration: ${branding.registration_number}`
              : "",
            branding.tax_number
              ? `Tax ID: ${branding.tax_number}`
              : "",
          ]
            .filter(Boolean)
            .map((value: any, index: number) => (
              <p key={index}>{value}</p>
            ))}
        </div>

        <div style={{ textAlign: "right" }}>
          <strong>{invoice.invoice_number}</strong>
          <p>Issue date: {invoice.issue_date}</p>
          <p>Due date: {invoice.due_date || "Not specified"}</p>
          <p>Status: {invoice.status}</p>
        </div>
      </header>

      <div className="invoice-print-meta">
        <section>
          <strong>Bill to</strong>

          <p>
            <b>{invoice.business_contacts?.name || "Customer"}</b>
          </p>

          {invoice.business_contacts?.email && (
            <p>{invoice.business_contacts.email}</p>
          )}

          {invoice.business_contacts?.address && (
            <p>{invoice.business_contacts.address}</p>
          )}

          {invoice.business_contacts?.tax_number && (
            <p>Tax number: {invoice.business_contacts.tax_number}</p>
          )}
        </section>

        <section>
          <strong>Payment details</strong>
          <p>Currency: {invoice.currency || "UGX"}</p>
          <p>Payment status: {Number(invoice.amount_paid || 0) >= Number(invoice.total || 0) && Number(invoice.total || 0) > 0 ? "Paid" : Number(invoice.amount_paid || 0) > 0 ? "Partially paid" : "Unpaid"}</p>
          <p>Amount paid: {money(invoice.amount_paid || 0)}</p>
          <p>Balance due: {money(balanceDue)}</p>
        </section>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {[
              "Description",
              "Qty",
              "Unit price",
              "Tax %",
              "Line total",
            ].map((heading) => (
              <th
                key={heading}
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #aaa",
                  padding: 10,
                }}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {(invoice.document_items || []).map(
            (item: any, index: number) => (
              <tr key={index}>
                {[
                  item.description,
                  item.quantity,
                  money(item.unit_price),
                  item.tax_rate,
                  money(item.line_total),
                ].map((value: any, cellIndex: number) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: 10,
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {value}
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>

      <div className="invoice-summary-grid">
        <div>
          {hasBankDetails && (
            <section
              className="invoice-bank-details"
              style={{
                padding: 16,
                border: `1px solid ${primaryColor}35`,
                borderLeft: `5px solid ${secondaryColor}`,
                borderRadius: 8,
                background: "#fcfafb",
              }}
            >
              <h3 style={{ margin: "0 0 12px", color: primaryColor, fontSize: 15 }}>
                Bank Transfer Details
              </h3>
              {bankDetails.length > 0 && (
                <table>
                  <tbody>
                    {bankDetails.map((item) => (
                      <tr key={item.label}>
                        <th scope="row">{item.label}</th>
                        <td>{String(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {branding.payment_instructions &&
                String(branding.payment_instructions).trim() && (
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    <strong>Payment Instructions:</strong>{" "}
                    {String(branding.payment_instructions)}
                  </p>
                )}
            </section>
          )}
        </div>
        <section className="invoice-total-box" style={{ margin: 0, maxWidth: 330, width: "100%" }}>

        {[
          ["Subtotal", invoice.subtotal],
          ["Tax", invoice.tax_amount],
          ["Total", invoice.total],
          ["Amount paid", invoice.amount_paid || 0],
          ["Balance due", balanceDue],
        ].map(([label, value]: any) => (
          <p
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: ["Total", "Balance due"].includes(label)
                ? "bold"
                : "normal",
            }}
          >
            <span>{label}</span>
            <span>{money(value)}</span>
          </p>
        ))}
        </section>
      </div>

      {invoice.notes && (
        <section style={{ marginTop: 32 }}>
          <strong>Notes</strong>
          <p>{invoice.notes}</p>
        </section>
      )}

      <footer
        style={{
          marginTop: 60,
          borderTop: "1px solid #ddd",
          paddingTop: 16,
          fontSize: 12,
        }}
      >
        {branding.footer_text || "Thank you for your business."}{" "}
        {invoice.status === "draft" ? "This document is a draft." : ""}
      </footer>
    </main>
    </>
  );
}
