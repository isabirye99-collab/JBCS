"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, RefreshCw, Plus, Search, HandCoins, CircleAlert } from "lucide-react";

type Obligation = {
  id: string; obligation_type: string; lender_type: string; lender_name: string;
  lender_contact?: string | null; reference_number?: string | null; description: string;
  currency: string; original_amount: number | string; outstanding_amount: number | string;
  interest_rate?: number | string | null; interest_type: string;
  received_or_incurred_date: string; due_date?: string | null; repayment_frequency: string;
  status: string; notes?: string | null;
};
const amount = (value: number | string, currency = "UGX") => {
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toLocaleString("en-UG")}`; }
};
const dateLabel = (value?: string | null) => value ? new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "No due date";
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ obligation_type: "loan", lender_type: "individual", lender_name: "", lender_contact: "", reference_number: "", description: "", currency: "UGX", original_amount: "", outstanding_amount: "", interest_rate: "", interest_type: "unspecified", received_or_incurred_date: today(), due_date: "", repayment_frequency: "flexible", notes: "" });

export default function MoneyOwedPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(blank);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/saas/obligations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load money owed records.");
      setItems(Array.isArray(data.obligations) ? data.obligations : []);
      setMessage("");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to load records."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => items.filter(item => {
    const q = query.toLowerCase();
    const matches = `${item.lender_name} ${item.description} ${item.reference_number || ""} ${item.obligation_type} ${item.lender_type}`.toLowerCase().includes(q);
    return matches && (status === "all" || item.status === status);
  }), [items, query, status]);
  const total = visible.reduce((sum, item) => sum + Number(item.outstanding_amount || 0), 0);
  const overdue = visible.filter(item => Number(item.outstanding_amount) > 0 && item.due_date && item.due_date < today() && item.status !== "disputed");
  const dueSoon = visible.filter(item => Number(item.outstanding_amount) > 0 && item.due_date && item.due_date >= today() && item.due_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  async function save(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const payload = { ...form, original_amount: Number(form.original_amount), outstanding_amount: form.outstanding_amount === "" ? Number(form.original_amount) : Number(form.outstanding_amount), interest_rate: form.interest_rate === "" ? null : Number(form.interest_rate), due_date: form.due_date || null };
      const response = await fetch("/api/saas/obligations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save obligation.");
      setForm(blank()); setShowForm(false); setMessage("Record saved. Add repayments and accounting reconciliation in the next stage."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save record."); }
    finally { setSaving(false); }
  }
  return <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-rose-100 bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span><span><strong className="block">JOHDEN</strong><span className="text-xs text-slate-500">Business Consultancy &amp; Finance</span></span></Link>
      <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">{[["Dashboard","/workspace/finance"],["Expenses","/workspace/finance/expenses"],["Loans","/workspace/finance/loans"],["Money Owed","/workspace/finance/money-owed"],["Reports","/workspace/finance/reports"]].map(([label,href]) => <Link key={href} href={href} className={`block rounded-xl px-3 py-3 text-sm font-semibold ${href === "/workspace/finance/money-owed" ? "bg-rose-50 text-[#F3192D]" : "text-slate-700 hover:bg-slate-50"}`}>{label}</Link>)}</nav>
      <div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-400">Johden Business Suite</div>
    </aside>
    <main className="jbcs-finance-page md:ml-[264px] jbcs-finance-consistent-main">
      <div className="jbcs-finance-top"><Link href="/workspace/finance">← Finance overview</Link><span>JOHDEN BUSINESS SUITE</span></div>
      <header className="jbcs-finance-heading"><div><p className="jbcs-eyebrow">FINANCE / LIABILITIES</p><h1>Money Owed</h1><p>Track loans and outstanding amounts payable to people and organisations.</p></div><div className="jbcs-page-actions"><button type="button" className="jbcs-primary-button" onClick={() => setShowForm(v => !v)}><Plus size={16} /> {showForm ? "Close form" : "Record money owed"}</button><button type="button" className="jbcs-secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</button></div></header>
      {message && <div role="status" className={`mb-4 rounded-xl border p-3 text-sm ${message.includes("saved") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{message}</div>}
      <div className="jbcs-stat-grid"><article><span>Total outstanding shown</span><strong>{amount(total)}</strong><small>Current filters · mixed currencies are not converted</small></article><article><span>Overdue records</span><strong>{overdue.length}</strong><small>Past due date with a remaining balance</small></article><article><span>Due in 30 days</span><strong>{dueSoon.length}</strong><small>Records with upcoming due dates</small></article></div>
      {showForm && <section className="jbcs-panel mb-5"><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">NEW RECORD</p><h2>Record a loan or amount owed</h2></div></div><form className="jbcs-form-grid" onSubmit={save}>
        <label>Record type<select required value={form.obligation_type} onChange={e => setForm(s => ({...s, obligation_type:e.target.value}))}><option value="loan">Loan / borrowing</option><option value="payable">Unpaid bill or purchase</option><option value="land_debt">Land-related debt</option><option value="other">Other money owed</option></select></label>
        <label>Lender / person to pay<select required value={form.lender_type} onChange={e => setForm(s => ({...s, lender_type:e.target.value}))}><option value="individual">Individual</option><option value="bank">Bank</option><option value="financial_institution">Financial institution / SACCO</option><option value="supplier">Supplier</option><option value="land_seller">Land seller</option><option value="director">Director</option><option value="shareholder">Shareholder</option><option value="other">Other</option></select></label>
        <label>Lender / payee name<input required maxLength={200} value={form.lender_name} onChange={e => setForm(s => ({...s,lender_name:e.target.value}))} placeholder="Full name or organisation" /></label>
        <label>Phone / contact<input maxLength={200} value={form.lender_contact} onChange={e => setForm(s => ({...s,lender_contact:e.target.value}))} /></label>
        <label>Description<input required maxLength={500} value={form.description} onChange={e => setForm(s => ({...s,description:e.target.value}))} placeholder="e.g. Land purchase balance" /></label>
        <label>Reference (optional)<input maxLength={120} value={form.reference_number} onChange={e => setForm(s => ({...s,reference_number:e.target.value}))} /></label>
        <label>Original amount<input required type="number" min="0.01" step="0.01" value={form.original_amount} onChange={e => setForm(s => ({...s,original_amount:e.target.value, outstanding_amount:s.outstanding_amount === "" ? "" : s.outstanding_amount}))} /></label>
        <label>Outstanding amount (defaults to original)<input type="number" min="0" step="0.01" value={form.outstanding_amount} onChange={e => setForm(s => ({...s,outstanding_amount:e.target.value}))} /></label>
        <label>Currency<input required minLength={3} maxLength={3} value={form.currency} onChange={e => setForm(s => ({...s,currency:e.target.value.toUpperCase()}))} /></label>
        <label>Interest type<select value={form.interest_type} onChange={e => setForm(s => ({...s,interest_type:e.target.value}))}><option value="unspecified">Not yet specified</option><option value="interest_free">Interest-free</option><option value="fixed">Fixed interest</option><option value="annual_rate">Annual interest rate</option></select></label>
        <label>Interest rate (%)<input type="number" min="0" max="1000" step="0.01" value={form.interest_rate} onChange={e => setForm(s => ({...s,interest_rate:e.target.value}))} placeholder="Optional" /></label>
        <label>Date borrowed / incurred<input type="date" required value={form.received_or_incurred_date} onChange={e => setForm(s => ({...s,received_or_incurred_date:e.target.value}))} /></label>
        <label>Due date (optional)<input type="date" value={form.due_date} onChange={e => setForm(s => ({...s,due_date:e.target.value}))} /></label>
        <label>Repayment arrangement<select value={form.repayment_frequency} onChange={e => setForm(s => ({...s,repayment_frequency:e.target.value}))}><option value="flexible">Flexible / agreed informally</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option><option value="one_off">One-off payment</option></select></label>
        <label className="jbcs-span-2">Notes<textarea rows={3} maxLength={4000} value={form.notes} onChange={e => setForm(s => ({...s,notes:e.target.value}))} placeholder="Agreement details, land reference, payment promises, etc." /></label>
        <div className="jbcs-span-2"><button className="jbcs-primary-button" disabled={saving}>{saving ? "Saving…" : "Save record"}</button></div>
      </form></section>}
      <section className="jbcs-panel"><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">OBLIGATIONS REGISTER</p><h2>Loans and amounts owed</h2></div></div><div className="jbcs-filters"><label className="flex min-w-0 flex-1 items-center gap-2"><Search size={16}/><input aria-label="Search obligations" placeholder="Search lender, description or reference…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filter status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option><option value="open">Open</option><option value="partially_paid">Partially paid</option><option value="overdue">Overdue</option><option value="settled">Settled</option><option value="disputed">Disputed</option><option value="written_off">Written off</option></select></div><div className="jbcs-table-wrap"><table className="jbcs-table"><thead><tr><th>Lender / payee</th><th>Type / description</th><th>Incurred</th><th>Due date</th><th>Original</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td><strong>{item.lender_name}</strong><small>{item.lender_contact || item.reference_number || "No contact/reference"}</small></td><td>{item.obligation_type.replaceAll("_"," ")}<small>{item.description}</small></td><td>{dateLabel(item.received_or_incurred_date)}</td><td>{dateLabel(item.due_date)}</td><td className="jbcs-amount">{amount(Number(item.original_amount),item.currency)}</td><td className="jbcs-amount">{amount(Number(item.outstanding_amount),item.currency)}</td><td><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize">{item.status.replaceAll("_"," ")}</span></td></tr>)}{!visible.length && <tr><td colSpan={7} className="jbcs-empty">{loading ? "Loading records…" : "No money owed records match these filters."}</td></tr>}</tbody></table></div><div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CircleAlert size={14}/> This register does not automatically reclassify Expenses or post accounting entries. Existing records must be reconciled before import.</div></section>
      <div className="mt-4"><Link href="/workspace/finance/expenses" className="text-sm font-semibold text-[#F3192D]">Review existing Expenses →</Link></div>
    </main>
  </div>;
}
