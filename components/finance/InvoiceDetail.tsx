"use client";

import { useState } from "react";
import { CheckCircle, Eye, Printer, Send, X } from "lucide-react";

type Item = { id?: string; description: string; quantity: number; unit_price: number; tax_rate: number; line_total?: number };
type Invoice = {
  id: string; invoice_number: string; issue_date: string; due_date: string | null;
  currency: string; subtotal: number; tax_amount: number; total: number; amount_paid: number;
  status: string; notes: string | null; business_contacts?: { name: string } | null;
  document_items?: Item[];
};
const today = () => new Date().toLocaleDateString("en-CA");
const money = (n: number, currency: string) => new Intl.NumberFormat("en-UG", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "UGX", maximumFractionDigits: 2 }).format(Number(n) || 0);
const dateLabel = (v?: string | null) => v ? new Date(v.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function InvoiceDetail({ invoice, onClose, onChanged }: { invoice: Invoice; onClose: () => void; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState(String(Math.max(0, Number(invoice.total) - Number(invoice.amount_paid))));
  const [paymentDate, setPaymentDate] = useState(today());
  const [method, setMethod] = useState("bank_transfer");
  const balance = Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));
  const status = (invoice.status || "draft").toLowerCase();

  async function markSent() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/finance/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id, status: "sent" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update invoice status.");
      onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update invoice."); }
    finally { setBusy(false); }
  }
  async function recordPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch("/api/finance/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: invoice.id, payment_date: paymentDate, amount: Number(amount), exchange_rate: 1, method, notes: "Payment recorded from invoice detail" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not record payment.");
      setShowPayment(false); onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not record payment."); }
    finally { setBusy(false); }
  }

  return <div className="finance-detail-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="finance-detail-modal" role="dialog" aria-modal="true" aria-label={"Invoice " + invoice.invoice_number}>
      <header className="finance-detail-toolbar">
        <div><strong>{invoice.invoice_number}</strong><span className={"invoice-status " + status}>{invoice.status || "draft"}</span></div>
        <div className="finance-detail-icons">
          {status === "draft" && <button type="button" className="finance-icon-button" title="Mark as sent" aria-label="Mark as sent" disabled={busy} onClick={markSent}><Send size={16}/></button>}
          <button type="button" className="finance-icon-button" title="Print invoice" aria-label="Print invoice" onClick={() => window.print()}><Printer size={16}/></button>
          {balance > 0 && <button type="button" className="finance-icon-button" title="Record payment / mark as paid" aria-label="Record payment or mark as paid" onClick={() => setShowPayment(v => !v)}><CheckCircle size={16}/></button>}
          <button type="button" className="finance-icon-button" title="Close preview" aria-label="Close preview" onClick={onClose}><X size={16}/></button>
        </div>
      </header>
      {error && <div className="finance-notice" role="alert">{error}</div>}
      {showPayment && <form className="finance-payment-inline" onSubmit={recordPayment}>
        <strong>Record payment received</strong>
        <label>Amount received ({invoice.currency})<input type="number" min="0.01" max={balance} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}/></label>
        <div className="finance-payment-fields">
          <label>Payment date<input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)}/></label>
          <label>Method<select value={method} onChange={e => setMethod(e.target.value)}><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
        </div>
        <small>Outstanding balance: {money(balance, invoice.currency)}</small>
        <div className="finance-modal-actions"><button type="button" className="finance-secondary-button" onClick={() => setShowPayment(false)}>Cancel</button><button type="submit" className="finance-primary-button" disabled={busy}>{busy ? "Saving…" : "Save payment"}</button></div>
      </form>}
      <div className="finance-invoice-preview" id="invoice-print-area">
        <div className="finance-preview-brand"><img src="/johden-logo.svg" alt="Johden Business Consultancy Services"/><div><h2>INVOICE</h2><b>{invoice.invoice_number}</b></div></div>
        <div className="finance-preview-rule"/>
        <div className="finance-preview-meta"><div><small>BILL TO</small><h3>{invoice.business_contacts?.name || "Customer"}</h3></div><div><p><small>ISSUE DATE</small><br/>{dateLabel(invoice.issue_date)}</p><p><small>DUE DATE</small><br/>{dateLabel(invoice.due_date)}</p><p><small>STATUS</small><br/><b>{invoice.status || "Draft"}</b></p></div></div>
        <table className="finance-preview-table"><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Tax</th><th>Total</th></tr></thead><tbody>{(invoice.document_items || []).map((item, i) => <tr key={item.id || i}><td>{item.description}</td><td>{Number(item.quantity)}</td><td>{money(Number(item.unit_price), invoice.currency)}</td><td>{Number(item.tax_rate || 0)}%</td><td>{money(Number(item.line_total ?? Number(item.quantity) * Number(item.unit_price) * (1 + Number(item.tax_rate || 0) / 100)), invoice.currency)}</td></tr>)}</tbody></table>
        <div className="finance-preview-totals"><p>Subtotal <b>{money(Number(invoice.subtotal), invoice.currency)}</b></p><p>Tax <b>{money(Number(invoice.tax_amount), invoice.currency)}</b></p><p className="finance-preview-grand">Total <b>{money(Number(invoice.total), invoice.currency)}</b></p><p>Paid <b>{money(Number(invoice.amount_paid), invoice.currency)}</b></p><p>Balance due <b>{money(balance, invoice.currency)}</b></p></div>
        {invoice.notes && <div className="finance-preview-notes"><small>NOTES / PAYMENT TERMS</small><p>{invoice.notes}</p></div>}
        <footer className="finance-preview-footer">Thank you for your business.<br/>Johden Business Consultancy Services</footer>
      </div>
      <style jsx>{`
        .finance-detail-backdrop{position:fixed;inset:0;z-index:1000;background:#17131b88;display:flex;justify-content:flex-end}
        .finance-detail-modal{background:#f8f8fa;width:min(760px,100%);height:100%;overflow:auto;padding:20px;box-shadow:-12px 0 36px #17131b22}
        .finance-detail-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
        .finance-detail-toolbar>div:first-child{display:flex;align-items:center;gap:12px}
        .finance-detail-icons{display:flex;gap:7px}
        .finance-invoice-preview{background:#fff;border:1px solid #e8e3e7;border-radius:8px;padding:36px;max-width:680px;margin:0 auto;color:#292629;min-height:680px}
        .finance-preview-brand{display:flex;justify-content:space-between;align-items:center;gap:20px}
        .finance-preview-brand img{width:210px;max-height:70px;object-fit:contain;object-position:left}
        .finance-preview-brand h2{margin:0;color:#f3192d;font-size:25px;letter-spacing:.08em}
        .finance-preview-brand b{font-size:12px}
        .finance-preview-rule{height:4px;background:#f3192d;margin:25px 0}
        .finance-preview-meta{display:flex;justify-content:space-between;gap:20px;margin-bottom:28px}
        .finance-preview-meta small,.finance-preview-notes small{font-size:9px;color:#77727a;font-weight:800;letter-spacing:.08em}
        .finance-preview-meta h3{font-size:16px;margin:8px 0}
        .finance-preview-meta p{font-size:11px;margin:0 0 8px}
        .finance-preview-table{width:100%;border-collapse:collapse;font-size:11px}
        .finance-preview-table th{background:#292629;color:#fff;text-align:left;padding:10px 7px}
        .finance-preview-table td{padding:11px 7px;border-bottom:1px solid #eee9e9}
        .finance-preview-totals{width:min(300px,100%);margin:24px 0 0 auto;font-size:11px}
        .finance-preview-totals p{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #eee9e9;padding:8px 0;margin:0}
        .finance-preview-totals .finance-preview-grand{font-size:14px;border-bottom:2px solid #f3192d}
        .finance-preview-notes{margin-top:28px;font-size:11px}
        .finance-preview-footer{border-top:1px solid #eee9e9;margin-top:40px;padding-top:16px;text-align:center;font-size:10px;color:#77727a}
        .finance-payment-inline{background:#fff;border:1px solid #e8e3e7;border-radius:8px;padding:16px;margin-bottom:16px;display:grid;gap:12px}
        .finance-payment-inline label{display:grid;gap:5px;font-size:11px;font-weight:700}
        .finance-payment-inline input,.finance-payment-inline select{min-width:0;width:100%;padding:9px;border:1px solid #ddd5db;border-radius:5px;background:#fff}
        .finance-payment-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:520px){.finance-invoice-preview{padding:18px}.finance-preview-brand img{width:135px}.finance-preview-brand h2{font-size:18px}.finance-preview-meta{flex-direction:column}.finance-preview-table{font-size:9px}.finance-detail-modal{padding:12px}}
        @media print{body *{visibility:hidden!important}.finance-detail-modal,.finance-detail-modal *{visibility:visible!important}.finance-detail-backdrop{position:static;display:block;background:#fff}.finance-detail-modal{width:100%;height:auto;overflow:visible;padding:0;box-shadow:none}.finance-detail-toolbar,.finance-payment-inline,.finance-notice{display:none!important}.finance-invoice-preview{border:0;max-width:none;min-height:0;padding:10mm;margin:0}.finance-preview-footer{break-inside:avoid}}
      `}</style>
    </section>
  </div>;
}
