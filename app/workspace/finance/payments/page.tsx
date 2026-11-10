"use client";


import "../finance.css";
import Link from "next/link";
import { LayoutDashboard, UsersRound, Package, FileText, FilePlus2, Receipt, CreditCard, Search, Plus, RefreshCw, Printer, WalletCards, Wallet, CalendarDays, FileBarChart, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Invoice = {
  id: string; invoice_number?: string | null; issue_date?: string | null; due_date?: string | null;
  currency?: string | null; total?: number | string | null; amount_paid?: number | string | null; status?: string | null;
  business_contacts?: { name?: string | null } | null;
};
type Payment = {
  id: string; invoice_id?: string | null; receipt_number?: string | null; payment_reference?: string | null; payment_date?: string | null;
  amount?: number | string | null; currency?: string | null; exchange_rate?: number | string | null;
  method?: string | null; notes?: string | null; created_at?: string | null;
  invoices?: { id?: string; invoice_number?: string | null; total?: number | string | null; amount_paid?: number | string | null; status?: string | null; business_contacts?: { name?: string | null } | null } | null;
};
const BRAND = "#F3192D";
const navigation = [
  { label: "Dashboard", href: "/workspace/finance", icon: LayoutDashboard },
  { label: "Customers", href: "/workspace/finance/customers", icon: UsersRound },
  { label: "Products & Services", href: "/workspace/finance/items", icon: Package },
  { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
  { label: "Quotes", href: "/workspace/finance/quotes", icon: FilePlus2 },
  { label: "Sales Receipts", href: "/workspace/finance/sales-receipts", icon: Receipt },
  { label: "Payments", href: "/workspace/finance/payments", icon: CreditCard },
  { label: "Expenses", href: "/workspace/finance/expenses", icon: Wallet },
  { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: CreditCard },
  { label: "Owner's Income & Commissions", href: "/workspace/finance/owner-income", icon: Wallet },
  { label: "Reports", href: "/workspace/finance/reports", icon: FileBarChart },
  { label: "Settings", href: "/workspace/settings", icon: Settings },
];
function money(value: unknown, currency = "UGX") {
  const amount = Number(value ?? 0);
  try { return new Intl.NumberFormat("en-UG", { style: "currency", currency, maximumFractionDigits: currency === "UGX" ? 0 : 2 }).format(Number.isFinite(amount) ? amount : 0); }
  catch { return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`; }
}
function today() { const date = new Date(); const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function methodLabel(value?: string | null) { return ({ cash: "Cash", bank_transfer: "Bank transfer", mobile_money: "Mobile money", card: "Card", cheque: "Cheque", other: "Other" } as Record<string, string>)[value || ""] || value || "—"; }
function balance(invoice: Invoice) { return Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0)); }
export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState(false);
  const [editPaymentDate, setEditPaymentDate] = useState(today());
  const [editMethod, setEditMethod] = useState("mobile_money");
  const [editReference, setEditReference] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [method, setMethod] = useState("mobile_money");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [pRes, iRes] = await Promise.all([fetch("/api/saas/payments", { cache: "no-store" }), fetch("/api/saas/invoices", { cache: "no-store" })]);
      const [pData, iData] = await Promise.all([pRes.json(), iRes.json()]);
      if (!pRes.ok) throw new Error(pData.error || "Could not load payments.");
      if (!iRes.ok) throw new Error(iData.error || "Could not load invoices.");
      setPayments(Array.isArray(pData.payments) ? pData.payments : []);
      setInvoices(Array.isArray(iData.invoices) ? iData.invoices : []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load payments."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const paymentId = new URLSearchParams(window.location.search).get("payment"); if (paymentId) setSelectedPaymentId(paymentId); }, []);

  const selectedInvoice = invoices.find((item) => item.id === invoiceId);
  const availableInvoices = useMemo(() => invoices.filter((item) => ["sent", "part_paid", "overdue"].includes((item.status || "").toLowerCase()) && balance(item) > 0), [invoices]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const ref = (p.payment_reference || "").toLowerCase();
      const inv = (p.invoices?.invoice_number || "").toLowerCase();
      const customer = (p.invoices?.business_contacts?.name || "").toLowerCase();
      return (!q || ref.includes(q) || inv.includes(q) || customer.includes(q) || p.id.toLowerCase().includes(q)) && (methodFilter === "all" || p.method === methodFilter);
    });
  }, [payments, search, methodFilter]);
  const totalReceived = useMemo(() => filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0), [filtered]);
  const selectedPayment = filtered.find((p) => p.id === selectedPaymentId) || filtered[0] || null;

  function chooseInvoice(id: string) {
    setInvoiceId(id);
    const invoice = invoices.find((item) => item.id === id);
    setAmount(invoice ? String(balance(invoice)) : "");
  }
  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (!selectedInvoice) { setError("Choose an invoice with an outstanding balance."); return; }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > balance(selectedInvoice)) { setError("Enter an amount greater than zero and no higher than the invoice balance."); return; }
    if (paymentDate > today()) { setError("Payment date cannot be in the future."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/saas/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: invoiceId, amount: numericAmount, payment_date: paymentDate, method, payment_reference: reference, notes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment could not be recorded.");
      setNotice(`Payment recorded successfully for invoice ${selectedInvoice.invoice_number || ""}. Use Payment receipt in the register to preview or print it.`.trim());
      setShowForm(false); setInvoiceId(""); setAmount(""); setPaymentDate(today()); setMethod("mobile_money"); setReference(""); setNotes("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Payment could not be recorded."); }
    finally { setSaving(false); }
  }
  async function savePaymentDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPayment) return;
    setError(""); setNotice("");
    if (!editPaymentDate) { setError("Choose the payment date."); return; }
    if (editPaymentDate > today()) { setError("Payment date cannot be in the future."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/saas/payments", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedPayment.id, payment_date: editPaymentDate, method: editMethod, payment_reference: editReference, notes: editNotes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment details could not be updated.");
      setNotice("Payment details updated. The recorded amount and linked invoice were not changed.");
      setEditingPayment(false);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Payment details could not be updated."); }
    finally { setSaving(false); }
  }
  const statusClass = (status?: string | null) => status === "overdue" ? "bg-rose-50 text-rose-700" : status === "part_paid" ? "bg-amber-50 text-amber-800" : status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700";

  return <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span><span><span className="block font-bold tracking-wide">JOHDEN</span><span className="mt-0.5 block text-xs text-slate-500">Business Consultancy &amp; Finance</span></span></Link>
      <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</div><nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">{navigation.map((item) => { const Icon = item.icon; const active = item.label === "Payments"; return <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-rose-50 text-slate-900" : "text-slate-700 hover:bg-slate-50 hover:text-[#F3192D]"}`}><Icon size={19} className={active ? "text-[#F3192D]" : "text-slate-700"}/><span className="flex-1">{item.label}</span>{active && <span className="h-1.5 w-1.5 rounded-full bg-[#F3192D]"/>}</Link>; })}</nav><div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-400">Johden Business Suite</div>
    </aside>
    <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 md:ml-[264px] jbcs-finance-consistent-main"><nav aria-label="Workspace navigation" className="mb-5 flex flex-wrap gap-2 md:hidden">{navigation.map((item) => <Link key={item.label} href={item.href} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${item.label === "Payments" ? "border-rose-200 bg-rose-50 text-[#F3192D]" : "border-slate-200 bg-white text-slate-700"}`}>{item.label}</Link>)}</nav>
      <div className="mx-auto max-w-[1440px] space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/workspace/finance" className="text-sm font-semibold text-slate-500 hover:text-[#F3192D]">← Finance overview</Link><div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3192D] text-white"><WalletCards size={23}/></div><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">Johden Business Suite</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1></div></div><p className="mt-2 max-w-2xl text-sm text-slate-500">Record customer payments, track collections and review outstanding invoice balances.</p></div><div className="flex flex-wrap gap-2"><Link href="/workspace/finance/sales-receipts" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:text-[#F3192D]">View sales receipts</Link><button onClick={() => { setShowForm((v) => !v); setError(""); setNotice(""); }} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#CF1022]"><Plus size={16} className="mr-1 inline"/>{showForm ? "Close form" : "Record payment"}</button></div></div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}{notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Payments shown</p><p className="mt-2 text-2xl font-bold">{filtered.length}</p><p className="mt-1 text-xs text-slate-400">Based on current filters</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Amount received (filtered)</p><p className="mt-2 text-2xl font-bold">{money(totalReceived, "UGX")}</p><p className="mt-1 text-xs text-slate-400">Mixed currencies are displayed in their payment rows</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">Invoices awaiting payment</p><p className="mt-2 text-2xl font-bold">{availableInvoices.length}</p><p className="mt-1 text-xs text-slate-400">Issued invoices with a balance due</p></div></div>
      {showForm && <form onSubmit={recordPayment} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="border-b border-slate-100 pb-4"><h2 className="text-xl font-bold">Record a payment</h2><p className="mt-1 text-sm text-slate-500">Payments are checked against the invoice balance before being saved.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2"><span>Invoice *</span><select required value={invoiceId} onChange={(e) => chooseInvoice(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]"><option value="">Select outstanding invoice</option>{availableInvoices.map((inv) => <option key={inv.id} value={inv.id}>{inv.invoice_number || "Invoice"} — {inv.business_contacts?.name || "Customer"} — Balance {money(balance(inv), inv.currency || "UGX")}</option>)}</select>{availableInvoices.length === 0 && <span className="block text-xs font-normal text-amber-700">No issued invoices with an outstanding balance are available.</span>}</label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Payment date *</span><input type="date" required max={today()} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]"/></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Amount received *</span><input type="number" required min="0.01" max={selectedInvoice ? balance(selectedInvoice) : undefined} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]"/>{selectedInvoice && <span className="block text-xs font-normal text-slate-500">Balance due: {money(balance(selectedInvoice), selectedInvoice.currency || "UGX")}</span>}</label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Payment method *</span><select required value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Transaction / reference</span><input maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Mobile money or bank reference" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]"/></label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-3"><span>Notes</span><textarea maxLength={1000} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional internal notes" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]"/></label>
      </div><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving || !availableInvoices.length} className="rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving payment…" : "Save payment"}</button></div></form>}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">All Payments <span className="text-sm font-medium text-slate-400">({filtered.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select a payment to review its details and receipt actions.</p></div><button onClick={() => void load()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-[#F3192D]"><RefreshCw size={15} className="mr-1 inline"/>Refresh</button></div><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search invoice, customer or reference" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm"/></div><select value={methodFilter} onChange={e=>setMethodFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All methods</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div><div className="grid min-h-[640px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment register</span><span className="text-xs text-slate-400">{filtered.length} records</span></div><div className="max-h-[720px] overflow-y-auto">{loading?<p className="p-6 text-sm text-slate-500">Loading payments…</p>:filtered.length===0?<p className="p-6 text-sm text-slate-500">No payments match your search.</p>:filtered.map(p=><button key={p.id} type="button" onClick={()=>setSelectedPaymentId(p.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left ${selectedPayment?.id===p.id?"bg-rose-50/80 ring-1 ring-inset ring-rose-100":"hover:bg-slate-50"}`}><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{p.invoices?.business_contacts?.name||"Customer"}</span><span className="whitespace-nowrap text-sm font-bold">{money(p.amount,p.currency||"UGX")}</span></span><span className="mt-1 block text-xs text-blue-600">{p.receipt_number||p.invoices?.invoice_number||"Payment"}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{p.payment_date||"—"}</span><span>{methodLabel(p.method)}</span></span></button>)}</div></aside><div className="min-w-0 bg-slate-50/70">{!selectedPayment?<div className="flex min-h-[450px] items-center justify-center p-8 text-center text-sm text-slate-500">Select a payment to view its details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected payment</p><h2 className="mt-0.5 text-xl font-bold">{selectedPayment.receipt_number||selectedPayment.invoices?.invoice_number||`PAY-${selectedPayment.id.slice(0,8).toUpperCase()}`}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setSelectedReceipt(selectedPayment)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Preview</button><button type="button" onClick={()=>setSelectedReceipt(selectedPayment)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">PDF / Print</button><button type="button" onClick={()=>{setEditPaymentDate(selectedPayment.payment_date||today());setEditMethod(selectedPayment.method||"other");setEditReference(selectedPayment.payment_reference||"");setEditNotes(selectedPayment.notes||"");setEditingPayment(v=>!v);}} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">{editingPayment?"Close edit":"Edit"}</button><button type="button" onClick={()=>setSelectedReceipt(selectedPayment)} className="rounded-lg bg-[#F3192D] px-3 py-2 text-sm font-semibold text-white"><Printer size={14} className="mr-1 inline"/>Payment receipt</button></div></div>{editingPayment && <form onSubmit={savePaymentDetails} className="m-5 space-y-4 rounded-xl border border-rose-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Edit payment details</h3><p className="text-xs text-slate-500">For accounting safety, this form updates the date, method, reference and notes only. The amount and linked invoice are unchanged.</p><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm font-semibold">Payment date<input required type="date" max={today()} value={editPaymentDate} onChange={e=>setEditPaymentDate(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"/></label><label className="space-y-1 text-sm font-semibold">Payment method<select required value={editMethod} onChange={e=>setEditMethod(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label><label className="space-y-1 text-sm font-semibold sm:col-span-2">Transaction / reference<input maxLength={120} value={editReference} onChange={e=>setEditReference(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"/></label><label className="space-y-1 text-sm font-semibold sm:col-span-2">Notes<textarea maxLength={1000} rows={3} value={editNotes} onChange={e=>setEditNotes(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal"/></label></div><div className="flex justify-end gap-2"><button type="button" onClick={()=>setEditingPayment(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-[#F3192D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving?"Saving…":"Save changes"}</button></div></form>}<div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p><p className="mt-2 text-lg font-bold">{selectedPayment.invoices?.business_contacts?.name||"Customer"}</p><p className="mt-1 text-sm text-slate-500">Invoice: {selectedPayment.invoices?.invoice_number||"Invoice unavailable"}</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount received</p><p className="mt-2 text-2xl font-bold">{money(selectedPayment.amount,selectedPayment.currency||"UGX")}</p><p className="mt-1 text-sm text-slate-500">Date: {selectedPayment.payment_date||"—"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</p><p className="mt-2 font-semibold">{methodLabel(selectedPayment.method)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</p><p className="mt-2 font-semibold">{selectedPayment.payment_reference||"—"}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedPayment.notes||"No notes recorded."}</p></div></div></div></>}</div></div><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">Showing up to 500 recent payment records.</div></section>
      </div>
      {selectedReceipt && <div className="fixed inset-0 z-50 flex justify-end overflow-y-auto bg-slate-950/45" role="dialog" aria-modal="true" aria-labelledby="payment-receipt-title" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedReceipt(null); }}>
        <section className="payment-receipt-print min-h-screen w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3 print:hidden"><div><p className="text-xs font-bold uppercase tracking-widest text-[#F3192D]">JBCS Finance</p><h2 id="payment-receipt-title" className="text-xl font-bold">Payment receipt</h2></div><div className="flex gap-2"><button type="button" onClick={() => { const previousTitle = document.title; document.title = (selectedReceipt.receipt_number || `JBCS-P-${selectedReceipt.id.slice(0, 8).toUpperCase()}`).replace(/\s+/g, "-"); window.print(); window.setTimeout(() => { document.title = previousTitle; }, 1500); }} className="rounded-lg bg-[#F3192D] px-4 py-2 text-sm font-semibold text-white"><Printer size={14} className="mr-1 inline"/>Print</button><button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">Close</button></div></div>
          <div className="border-b-2 border-[#F3192D] pb-5"><img src="/johden-logo.svg" alt="Johden Business Consultancy Services" className="mb-4 h-12 max-w-[220px] object-contain object-left"/><p className="text-xs font-bold uppercase tracking-widest text-[#F3192D]">Official payment receipt</p><h3 className="mt-2 text-2xl font-bold">Payment received</h3><p className="mt-1 text-sm text-slate-500">Receipt no.: {selectedReceipt.receipt_number || selectedReceipt.id} · Transaction reference: {selectedReceipt.payment_reference || "—"}</p></div>
          <div className="mt-6 rounded-xl bg-slate-50 p-5"><p className="text-sm text-slate-500">Amount received</p><p className="mt-2 text-3xl font-bold">{money(selectedReceipt.amount, selectedReceipt.currency || "UGX")}</p><p className="mt-2 text-sm text-slate-500">Payment date: {selectedReceipt.payment_date || "—"}</p></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Received from</p><p className="mt-2 font-semibold">{selectedReceipt.invoices?.business_contacts?.name || "Customer"}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Payment details</p><p className="mt-2 text-sm">Invoice: <strong>{selectedReceipt.invoices?.invoice_number || "—"}</strong></p><p className="mt-2 text-sm">Method: <strong>{methodLabel(selectedReceipt.method)}</strong></p></div></div>
          <div className="mt-6 rounded-xl border border-slate-200"><div className="flex justify-between gap-4 bg-slate-50 p-4 text-sm"><span>Invoice total</span><strong>{money(selectedReceipt.invoices?.total, selectedReceipt.currency || "UGX")}</strong></div><div className="flex justify-between gap-4 border-t border-slate-100 p-4 text-sm"><span>This payment</span><strong>{money(selectedReceipt.amount, selectedReceipt.currency || "UGX")}</strong></div></div>
          {selectedReceipt.notes && <p className="mt-5 whitespace-pre-wrap text-sm text-slate-600">Notes: {selectedReceipt.notes}</p>}<p className="mt-10 border-t border-dashed border-slate-300 pt-5 text-center text-sm font-semibold">Thank you for your payment.</p>
        </section>
      </div>}
      <style jsx global>{`@media print { body * { visibility: hidden !important; } .payment-receipt-print, .payment-receipt-print * { visibility: visible !important; } .payment-receipt-print { position: fixed !important; inset: 0 !important; width: 100% !important; max-width: none !important; min-height: 100vh !important; overflow: visible !important; box-shadow: none !important; padding: 18mm !important; } .payment-receipt-print .print\\:hidden { display: none !important; } @page { size: A4; margin: 0; } }`}
      </style>
      </main>
  </div>;
}
