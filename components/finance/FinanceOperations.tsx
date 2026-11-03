"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Section = "Expenses" | "Payments" | "Reports";
type Invoice = { id: string; invoice_number: string; currency: string; total: number; amount_paid: number; status: string; business_contacts?: { name: string } | null };
type Supplier = { id: string; name: string };
type Expense = { id: string; expense_date: string; category: string; description: string; amount: number; currency: string; payment_method: string | null; receipt_url?: string | null; business_contacts?: { name: string } | null };
type Payment = { id: string; invoice_id: string; payment_reference: string | null; payment_date: string; amount: number; currency: string; method: string; invoices?: { invoice_number: string } | null };
type Report = { summary: { invoiceCount: number; paymentCount: number; expenseCount: number; outstandingInvoiceCount: number; overdueInvoiceCount: number; invoicedByCurrency: Record<string, number>; collectedByCurrency: Record<string, number>; expensesByCurrency: Record<string, number>; outstandingByCurrency: Record<string, number> }; invoices: unknown[]; payments: unknown[]; expenses: unknown[] };
const methods = [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "card", label: "Card" }, { value: "cheque", label: "Cheque" }, { value: "other", label: "Other" }];
const today = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); };
const money = (amount: number, currency = "UGX") => new Intl.NumberFormat("en-UG", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "UGX", maximumFractionDigits: 2 }).format(Number(amount) || 0);
const dateLabel = (value: string) => value ? new Date(value.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB") : "—";

export default function FinanceOperations({ section, onNotice }: { section: Section; onNotice: (message: string) => void }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expense, setExpense] = useState({ expense_date: today(), category: "Office supplies", description: "", amount: "", currency: "UGX", exchange_rate: "1", payment_method: "cash", supplier_contact_id: "", receipt_url: "", notes: "" });
  const [payment, setPayment] = useState({ invoice_id: "", payment_date: today(), amount: "", method: "cash", payment_reference: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (section === "Reports" && from && to && from > to) {
        throw new Error("The start date must be on or before the end date.");
      }
      if (section === "Expenses") {
        const [r, sr] = await Promise.all([fetch("/api/finance/expenses", { cache: "no-store" }), fetch("/api/finance/customers?type=supplier", { cache: "no-store" })]);
        const [d, sd] = await Promise.all([r.json(), sr.json()]);
        if (!r.ok) throw new Error(d.error || "Unable to load expenses.");
        if (!sr.ok) throw new Error(sd.error || "Unable to load suppliers.");
        setExpenses(Array.isArray(d.expenses) ? d.expenses : []);
        setSuppliers(Array.isArray(sd.customers) ? sd.customers : []);
      } else if (section === "Payments") {
        const [pr, ir] = await Promise.all([fetch("/api/finance/payments", { cache: "no-store" }), fetch("/api/finance/invoices", { cache: "no-store" })]);
        const [pd, id] = await Promise.all([pr.json(), ir.json()]);
        if (!pr.ok) throw new Error(pd.error || "Unable to load payments.");
        if (!ir.ok) throw new Error(id.error || "Unable to load invoices for payments.");
        setPayments(Array.isArray(pd.payments) ? pd.payments : []); setInvoices(Array.isArray(id.invoices) ? id.invoices : []);
      } else {
        const p = new URLSearchParams(); if (from) p.set("from", from); if (to) p.set("to", to);
        const r = await fetch("/api/finance/reports?" + p.toString(), { cache: "no-store" }); const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Unable to generate reports.");
        setReport(d);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load finance records."); }
    finally { setLoading(false); }
  }, [section, from, to]);

  useEffect(() => { void load(); }, [load]);
  const filteredExpenses = useMemo(() => expenses.filter(x => [x.description, x.category, x.business_contacts?.name || ""].join(" ").toLowerCase().includes(search.toLowerCase())), [expenses, search]);
  const filteredPayments = useMemo(() => payments.filter(x => [x.payment_reference || "", x.invoices?.invoice_number || "", x.method].join(" ").toLowerCase().includes(search.toLowerCase())), [payments, search]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const isExpense = section === "Expenses";
      const body = isExpense ? { ...expense, amount: Number(expense.amount), exchange_rate: Number(expense.exchange_rate) } : { ...payment, amount: Number(payment.amount) };
      const r = await fetch(isExpense ? "/api/finance/expenses" : "/api/finance/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Unable to save record.");
      setShowForm(false); onNotice(isExpense ? "Expense saved successfully." : "Payment recorded successfully.");
      if (isExpense) setExpense({ expense_date: today(), category: "Office supplies", description: "", amount: "", currency: "UGX", exchange_rate: "1", payment_method: "cash", supplier_contact_id: "", receipt_url: "", notes: "" });
      else setPayment({ invoice_id: "", payment_date: today(), amount: "", method: "cash", payment_reference: "", notes: "" });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save record."); }
    finally { setSaving(false); }
  }

  function exportReportCsv() {
    if (!report) return;
    const rows: (string | number)[][] = [
      ["JBCS Financial Report"],
      ["From", from || "All dates"],
      ["To", to || "All dates"],
      [],
      ["Metric", "Currency", "Amount"],
      ...reportRows.map(row => [row.label, row.currency, row.amount]),
      [],
      ["Invoice count", report.summary.invoiceCount],
      ["Payment count", report.summary.paymentCount],
      ["Expense count", report.summary.expenseCount],
      ["Outstanding invoice count", report.summary.outstandingInvoiceCount],
      ["Overdue invoice count", report.summary.overdueInvoiceCount],
    ];
    const csv = rows.map(row => row.map(value => {
      const text = String(value ?? "");
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jbcs-financial-report-${from || "all"}-to-${to || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const inputStyle = { width: "100%", padding: "11px 12px", border: "1px solid var(--finance-border, #d8dee8)", borderRadius: 8, background: "var(--finance-input, #fff)", color: "inherit", font: "inherit" };
  const fieldStyle = { display: "grid", gap: 6, marginBottom: 14 } as const;
  const selectStyle = inputStyle;
  const reportRows = report
    ? Object.entries({
        Invoiced: report.summary.invoicedByCurrency,
        Collected: report.summary.collectedByCurrency,
        Expenses: report.summary.expensesByCurrency,
        Outstanding: report.summary.outstandingByCurrency,
      }).flatMap(([label, values]) =>
        Object.entries(values).map(([currency, amount]) => ({ label, currency, amount })),
      )
    : [];

  return <div className="finance-panel finance-table-panel">
    <div className="finance-panel-heading"><div><h2>{section}</h2><p>{section === "Expenses" ? "Record and review business expenditure." : section === "Payments" ? "Record receipts against outstanding invoices." : "Financial summaries from saved invoices, payments and expenses."}</p></div>
      {section !== "Reports" ? <button className="finance-primary-button" onClick={() => setShowForm(v => !v)}>{showForm ? "Cancel" : section === "Expenses" ? "+ New expense" : "+ Record payment"}</button> : <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button className="finance-secondary-button" onClick={exportReportCsv} disabled={!report}>Export CSV</button><button className="finance-secondary-button" onClick={() => void load()} disabled={loading}>Refresh report</button></div>}
    </div>
    {error && <div className="finance-notice" role="alert">{error} <button className="finance-text-button" onClick={() => void load()}>Retry</button></div>}
    {showForm && section !== "Reports" && <form onSubmit={save} style={{ padding: 18, border: "1px solid #e1e5eb", borderRadius: 12, marginBottom: 20 }}>
      {section === "Expenses" ? <>
        <div style={fieldStyle}><label htmlFor="expense-date">Expense date</label><input id="expense-date" style={inputStyle} type="date" required value={expense.expense_date} onChange={e => setExpense({ ...expense, expense_date: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="expense-category">Category</label><input id="expense-category" style={inputStyle} required maxLength={100} value={expense.category} onChange={e => setExpense({ ...expense, category: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="expense-description">Description</label><input id="expense-description" style={inputStyle} required maxLength={500} value={expense.description} onChange={e => setExpense({ ...expense, description: e.target.value })} placeholder="What was the expense for?"/></div>
        <div style={fieldStyle}><label htmlFor="expense-amount">Amount</label><input id="expense-amount" style={inputStyle} type="number" min="0.01" step="0.01" required value={expense.amount} onChange={e => setExpense({ ...expense, amount: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="expense-currency">Currency</label><select id="expense-currency" style={selectStyle} value={expense.currency} onChange={e => setExpense({ ...expense, currency: e.target.value })}>{["UGX","USD","EUR","GBP","KES","TZS","RWF"].map(c => <option key={c}>{c}</option>)}</select></div>
        <div style={fieldStyle}><label htmlFor="expense-rate">Exchange rate to base currency</label><input id="expense-rate" style={inputStyle} type="number" min="0.000001" step="any" required value={expense.exchange_rate} onChange={e => setExpense({ ...expense, exchange_rate: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="expense-supplier">Supplier (optional)</label><select id="expense-supplier" style={selectStyle} value={expense.supplier_contact_id} onChange={e => setExpense({ ...expense, supplier_contact_id: e.target.value })}><option value="">No supplier selected</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div style={fieldStyle}><label htmlFor="expense-method">Payment method</label><select id="expense-method" style={selectStyle} value={expense.payment_method} onChange={e => setExpense({ ...expense, payment_method: e.target.value })}>{methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        <div style={fieldStyle}><label htmlFor="expense-receipt">Receipt URL (optional)</label><input id="expense-receipt" style={inputStyle} type="url" maxLength={2000} value={expense.receipt_url} onChange={e => setExpense({ ...expense, receipt_url: e.target.value })} placeholder="https://..."/></div>
        <div style={fieldStyle}><label htmlFor="expense-notes">Notes</label><textarea id="expense-notes" style={inputStyle} rows={2} value={expense.notes} onChange={e => setExpense({ ...expense, notes: e.target.value })}/></div>
      </> : <>
        <div style={fieldStyle}><label htmlFor="payment-invoice">Invoice</label><select id="payment-invoice" style={selectStyle} required value={payment.invoice_id} onChange={e => { const invoice = invoices.find(i => i.id === e.target.value); setPayment({ ...payment, invoice_id: e.target.value, amount: invoice ? String(Math.max(0, Number(invoice.total)-Number(invoice.amount_paid))) : "" }); }}><option value="">Select an outstanding invoice</option>{invoices.filter(i => !["void","paid"].includes(i.status) && Number(i.total)>Number(i.amount_paid)).map(i => <option key={i.id} value={i.id}>{i.invoice_number} — {i.business_contacts?.name || "Customer"} — {money(Number(i.total)-Number(i.amount_paid), i.currency)}</option>)}</select></div>
        <div style={fieldStyle}><label htmlFor="payment-date">Payment date</label><input id="payment-date" style={inputStyle} type="date" required value={payment.payment_date} onChange={e => setPayment({ ...payment, payment_date: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="payment-amount">Amount received</label><input id="payment-amount" style={inputStyle} type="number" min="0.01" step="0.01" required value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })}/></div>
        <div style={fieldStyle}><label htmlFor="payment-method">Payment method</label><select id="payment-method" style={selectStyle} value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}>{methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        <div style={fieldStyle}><label htmlFor="payment-ref">Reference</label><input id="payment-ref" style={inputStyle} maxLength={200} value={payment.payment_reference} onChange={e => setPayment({ ...payment, payment_reference: e.target.value })} placeholder="Receipt or transaction reference"/></div>
        <div style={fieldStyle}><label htmlFor="payment-notes">Notes</label><textarea id="payment-notes" style={inputStyle} rows={2} value={payment.notes} onChange={e => setPayment({ ...payment, notes: e.target.value })}/></div>
      </>}
      <div className="finance-modal-actions"><button type="button" className="finance-secondary-button" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button><button className="finance-primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : section === "Expenses" ? "Save expense" : "Record payment"}</button></div>
    </form>}
    {section !== "Reports" && <div style={{ margin: "12px 0" }}><input className="finance-search" value={search} onChange={e => setSearch(e.target.value)} placeholder={section === "Expenses" ? "Search expenses..." : "Search payments..."}/></div>}
    {loading ? <p className="finance-empty">Loading {section.toLowerCase()}…</p> : section === "Expenses" ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>DATE</th><th>CATEGORY</th><th>DESCRIPTION</th><th>SUPPLIER</th><th>METHOD</th><th>RECEIPT</th><th>AMOUNT</th></tr></thead><tbody>{filteredExpenses.map(x => <tr key={x.id}><td>{dateLabel(x.expense_date)}</td><td>{x.category}</td><td>{x.description}</td><td>{x.business_contacts?.name || "—"}</td><td>{x.payment_method || "—"}</td><td>{x.receipt_url ? <a href={x.receipt_url} target="_blank" rel="noreferrer">View receipt</a> : "—"}</td><td>{money(Number(x.amount), x.currency)}</td></tr>)}</tbody></table>{!filteredExpenses.length && <p className="finance-empty">No expenses found.</p>}</div> : section === "Payments" ? <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>DATE</th><th>REFERENCE / INVOICE</th><th>METHOD</th><th>AMOUNT</th></tr></thead><tbody>{filteredPayments.map(x => <tr key={x.id}><td>{dateLabel(x.payment_date)}</td><td>{x.payment_reference || x.invoices?.invoice_number || "—"}</td><td>{x.method.replace("_"," ")}</td><td>{money(Number(x.amount), x.currency)}</td></tr>)}</tbody></table>{!filteredPayments.length && <p className="finance-empty">No payments found.</p>}</div> : <><div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "16px 0" }}><label>From <input style={inputStyle} type="date" value={from} onChange={e => setFrom(e.target.value)}/></label><label>To <input style={inputStyle} type="date" value={to} onChange={e => setTo(e.target.value)}/></label><button className="finance-secondary-button" onClick={() => void load()} disabled={loading}>Apply dates</button></div>{report && <><div className="finance-stat-grid">{[["Invoices", report.summary.invoiceCount],["Payments",report.summary.paymentCount],["Expenses",report.summary.expenseCount],["Outstanding invoices", report.summary.outstandingInvoiceCount],["Overdue invoices",report.summary.overdueInvoiceCount]].map(([label,value]) => <article className="finance-stat-card" key={String(label)}><div className="finance-stat-top"><span>{label}</span></div><strong>{value}</strong></article>)}</div><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>METRIC</th><th>CURRENCY</th><th>AMOUNT</th></tr></thead><tbody>{reportRows.map(row => <tr key={row.label + row.currency}><td>{row.label}</td><td>{row.currency}</td><td>{money(row.amount, row.currency)}</td></tr>)}</tbody></table></div></>}</>}
  </div>;
}
