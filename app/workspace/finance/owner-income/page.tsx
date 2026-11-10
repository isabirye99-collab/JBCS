"use client";

import "../finance.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, FileBarChart, FilePlus2, FileText, LayoutDashboard, Package, Receipt, CreditCard, Settings, UsersRound, Wallet, X, Plus, CircleDollarSign } from "lucide-react";

type Entry = {
  id: string; entry_type: "owner_income" | "commission"; recipient: "owner" | "business";
  category: string; payer: string; description: string; earned_date: string;
  expected_payment_date?: string | null; amount: number; amount_received: number;
  currency: string; payment_method?: string | null; payment_reference?: string | null;
  status: "pending" | "partially_paid" | "paid" | "cancelled"; notes?: string | null;
};
type Payment = { id: string; entry_id: string; payment_date: string; amount: number; currency: string; payment_method: string; payment_reference?: string | null };
const nav = [
  { label: "Dashboard", href: "/workspace/finance", icon: LayoutDashboard },
  { label: "Customers", href: "/workspace/finance/customers", icon: UsersRound },
  { label: "Products & Services", href: "/workspace/finance/items", icon: Package },
  { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
  { label: "Quotes", href: "/workspace/finance/quotes", icon: FilePlus2 },
  { label: "Sales Receipts", href: "/workspace/finance/sales-receipts", icon: Receipt },
  { label: "Payments", href: "/workspace/finance/payments", icon: CreditCard },
  { label: "Expenses", href: "/workspace/finance/expenses", icon: Wallet },
  { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: CreditCard },
  { label: "Owner's Income & Commissions", href: "/workspace/finance/owner-income", icon: CircleDollarSign },
  { label: "Reports", href: "/workspace/finance/reports", icon: FileBarChart },
  { label: "Settings", href: "/workspace/settings", icon: Settings },
];
const money = (amount: number, currency: string) => new Intl.NumberFormat("en-UG", { style: "currency", currency: currency || "UGX", maximumFractionDigits: 2 }).format(Number(amount) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const emptyEntry = { entry_type: "owner_income", recipient: "owner", category: "Owner salary", payer: "", description: "", earned_date: today(), expected_payment_date: "", amount: "", currency: "UGX", notes: "" };

export default function OwnerIncomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"entry" | "payment" | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [detailEntry, setDetailEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryForm, setEntryForm] = useState<Record<string, string>>(emptyEntry);
  const [paymentForm, setPaymentForm] = useState({ payment_date: today(), amount: "", currency: "UGX", payment_method: "bank_transfer", payment_reference: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/saas/owner-income", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load owner income.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setMessage("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load owner income."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(e => [e.entry_type, e.recipient, e.category, e.payer, e.description, e.status, e.currency].some(v => String(v || "").toLowerCase().includes(q)));
  }, [entries, search]);
  const selectedEntry = filtered.find((entry) => entry.id === selectedEntryId) || filtered[0] || null;
  const pendingCount = entries.filter(e => e.status === "pending" || e.status === "partially_paid").length;
  const receivedByCurrency = useMemo(() => entries.reduce<Record<string, number>>((acc, e) => { acc[e.currency] = (acc[e.currency] || 0) + Number(e.amount_received || 0); return acc; }, {}), [entries]);
  const outstandingByCurrency = useMemo(() => entries.filter(e => e.status !== "cancelled").reduce<Record<string, number>>((acc, e) => { acc[e.currency] = (acc[e.currency] || 0) + Math.max(0, Number(e.amount) - Number(e.amount_received)); return acc; }, {}), [entries]);

  async function submitEntry(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/saas/owner-income", { method: editingEntry ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingEntry ? { ...entryForm, id: editingEntry.id } : entryForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save record.");
      setModal(null); setEditingEntry(null); setEntryForm({ ...emptyEntry, earned_date: today() }); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save record."); }
    finally { setSaving(false); }
  }

  function openEdit(entry: Entry) {
    setEditingEntry(entry);
    setEntryForm({ entry_type: entry.entry_type, recipient: entry.recipient, category: entry.category, payer: entry.payer, description: entry.description, earned_date: entry.earned_date, expected_payment_date: entry.expected_payment_date || "", amount: String(entry.amount), currency: entry.currency, notes: entry.notes || "" });
    setMessage(""); setModal("entry");
  }

  function openPayment(entry: Entry) {
    setSelected(entry);
    setPaymentForm({ payment_date: today(), amount: "", currency: entry.currency, payment_method: "bank_transfer", payment_reference: "", notes: "" });
    setMessage(""); setModal("payment");
  }
  async function submitPayment(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/saas/owner-income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...paymentForm, action: "record_payment", entry_id: selected.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record payment.");
      setModal(null); setSelected(null); await load(); setMessage("Payment recorded successfully. The outstanding balance has been updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not record payment."); }
    finally { setSaving(false); }
  }

  return <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span>
        <span><span className="block font-bold tracking-wide">JOHDEN</span><span className="mt-0.5 block text-xs text-slate-500">Business Consultancy & Finance</span></span>
      </Link>
      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">{nav.map(item => { const Icon = item.icon; const active = item.href === "/workspace/finance/owner-income"; return <Link key={item.label} href={item.href} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-[#fff0f1] text-[#9f1d35]" : "text-slate-600 hover:bg-[#fff5f5]"}`} aria-current={active ? "page" : undefined}><Icon size={18}/>{item.label}</Link>; })}</nav>
      <Link href="/workspace/settings" className="border-t border-slate-100 p-4 text-sm text-slate-600">Settings</Link>
    </aside>

    <main className="min-h-screen md:ml-[264px]">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur md:px-8">
        <div><Link href="/workspace/finance" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#9f1d35]"><ArrowLeft size={14}/> Finance dashboard</Link><h1 className="text-xl font-bold tracking-tight md:text-2xl">Owner’s Income & Commissions</h1><p className="mt-1 text-sm text-slate-500">Track owner earnings, commissions and incoming payments.</p></div>
        <button onClick={() => { setEntryForm({ ...emptyEntry, earned_date: today() }); setMessage(""); setModal("entry"); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#c91527]"><Plus size={16}/> Add record</button>
      </header>
      <section className="space-y-6 p-4 md:p-8">
        {message && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{message}</div>}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary title="Total records" value={String(entries.length)} detail="Owner income and commissions"/>
          <Summary title="Awaiting payment" value={String(pendingCount)} detail="Pending or partly paid"/>
          <Summary title="Received" value={Object.entries(receivedByCurrency).map(([c,v]) => money(v,c)).join(" · ") || money(0,"UGX")} detail="Grouped by currency"/>
          <Summary title="Outstanding" value={Object.entries(outstandingByCurrency).map(([c,v]) => money(v,c)).join(" · ") || money(0,"UGX")} detail="Excludes cancelled records"/>
        </div>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
<div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Income &amp; Commissions Register</h2><p className="mt-1 text-xs text-slate-500">Select a record to view its details and actions.</p></div><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search income, payer, category…" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm sm:max-w-sm"/></div>
<div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Income register ({filtered.length})</div><div className="max-h-[720px] overflow-y-auto">{loading?<p className="p-6 text-sm text-slate-500">Loading income records…</p>:filtered.length===0?<p className="p-6 text-sm text-slate-500">No owner income or commission records found.</p>:filtered.map(entry=><button type="button" key={entry.id} onClick={()=>setSelectedEntryId(entry.id)} className="block w-full border-b border-slate-100 px-4 py-4 text-left hover:bg-rose-50"><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{entry.category || (entry.entry_type==="commission"?"Commission":"Owner income")}</span><span className="whitespace-nowrap text-sm font-bold">{money(Number(entry.amount),entry.currency)}</span></span><span className="mt-1 block truncate text-xs text-slate-500">{entry.payer} · {entry.description}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{entry.earned_date}</span><span>{entry.status.replace("_"," ")}</span></span></button>)}</div></aside>
<div className="min-w-0 bg-slate-50/70">{!selectedEntry?<div className="flex min-h-[450px] items-center justify-center p-8 text-sm text-slate-500">Select an income record to view details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected income record</p><h2 className="mt-0.5 text-xl font-bold">{selectedEntry.category}</h2><p className="mt-1 text-xs capitalize text-slate-500">{selectedEntry.entry_type.replace("_"," ")} · {selectedEntry.status.replace("_"," ")}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setDetailEntry(selectedEntry)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Preview</button><button type="button" onClick={()=>openEdit(selectedEntry)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Edit</button>{selectedEntry.status!=="cancelled"&&Number(selectedEntry.amount_received)<Number(selectedEntry.amount)&&<button type="button" onClick={()=>openPayment(selectedEntry)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Record payment</button>}<details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">••• More</summary><div className="absolute right-0 z-20 mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={()=>setDetailEntry(selectedEntry)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Full details</button></div></details></div></div>
<div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded amount</p><p className="mt-2 text-2xl font-bold">{money(Number(selectedEntry.amount),selectedEntry.currency)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Received</p><p className="mt-2 text-2xl font-bold">{money(Number(selectedEntry.amount_received),selectedEntry.currency)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outstanding</p><p className="mt-2 text-xl font-bold">{money(Math.max(0,Number(selectedEntry.amount)-Number(selectedEntry.amount_received)),selectedEntry.currency)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recipient / payer</p><p className="mt-2 font-semibold">{selectedEntry.recipient} · {selectedEntry.payer}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Earned date</p><p className="mt-2 font-semibold">{selectedEntry.earned_date}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected payment</p><p className="mt-2 font-semibold">{selectedEntry.expected_payment_date||"—"}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description / notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedEntry.description}{selectedEntry.notes ? " — " + selectedEntry.notes : ""}</p></div></div></div></>}</div></div></section>
{payments.length > 0 && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Recent payments</h2><p className="mt-1 text-xs text-slate-500">Individual payment transactions, including partial payments.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Payment date","Income / commission","Amount","Method","Reference"].map(x=><th key={x} className="px-5 py-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{payments.map(p=>{const e=entries.find(x=>x.id===p.entry_id);return <tr key={p.id}><td className="px-5 py-3">{p.payment_date}</td><td className="px-5 py-3">{e ? `${e.category} — ${e.payer}` : "Income entry"}</td><td className="px-5 py-3 font-semibold">{money(Number(p.amount),p.currency)}</td><td className="px-5 py-3">{p.payment_method.replace("_"," ")}</td><td className="px-5 py-3">{p.payment_reference || "—"}</td></tr>;})}</tbody></table></div></div>}
      </section>
      <nav className="sticky bottom-0 z-20 grid grid-cols-3 border-t border-slate-200 bg-white px-1 py-2 md:hidden">{[{label:"Home",href:"/workspace/finance",icon:LayoutDashboard},{label:"Invoices",href:"/workspace/finance/invoices",icon:FileText},{label:"Owner income",href:"/workspace/finance/owner-income",icon:CircleDollarSign}].map(item=>{const Icon=item.icon;return <Link key={item.label} href={item.href} className={`flex flex-col items-center gap-1 py-2 text-[10px] ${item.label==="Owner income"?"text-[#F3192D]":"text-slate-500"}`}><Icon size={19}/>{item.label}</Link>;})}</nav>
    </main>
    {detailEntry && <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="owner-detail-title" onMouseDown={e=>{if(e.target===e.currentTarget)setDetailEntry(null);}}><section className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Income record</p><h2 id="owner-detail-title" className="mt-2 text-xl font-bold">{detailEntry.category}</h2><p className="mt-1 text-sm text-slate-500">{detailEntry.entry_type==="commission"?"Commission":"Owner income"} · {detailEntry.status.replace("_"," ")}</p></div><button type="button" onClick={()=>setDetailEntry(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Close</button></div><div className="mt-6 grid grid-cols-2 gap-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Recorded amount</p><p className="mt-2 text-lg font-bold">{money(Number(detailEntry.amount),detailEntry.currency)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Received</p><p className="mt-2 text-lg font-bold">{money(Number(detailEntry.amount_received),detailEntry.currency)}</p></div><div><p className="text-xs text-slate-500">Recipient</p><p className="mt-1 font-semibold">{detailEntry.recipient}</p></div><div><p className="text-xs text-slate-500">Payer</p><p className="mt-1 font-semibold">{detailEntry.payer}</p></div><div><p className="text-xs text-slate-500">Earned date</p><p className="mt-1 font-semibold">{detailEntry.earned_date}</p></div><div><p className="text-xs text-slate-500">Expected payment</p><p className="mt-1 font-semibold">{detailEntry.expected_payment_date||"—"}</p></div><div className="col-span-2"><p className="text-xs text-slate-500">Description / notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{detailEntry.description||detailEntry.notes||"No notes recorded."}</p></div></div><div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={()=>{openEdit(detailEntry);setDetailEntry(null);}} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white">Edit record</button>{detailEntry.status!=="cancelled" && Number(detailEntry.amount_received)<Number(detailEntry.amount) && <button type="button" onClick={()=>{openPayment(detailEntry);setDetailEntry(null);}} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Record payment</button>}</div></section></div>}{modal && <div className="fixed inset-0 z-50 flex justify-end overflow-y-auto bg-slate-950/40" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(null);}}><section role="dialog" aria-modal="true" aria-labelledby="owner-income-dialog-title" className="min-h-screen w-full max-w-2xl overflow-y-auto rounded-l-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 id="owner-income-dialog-title" className="font-bold">{modal==="entry"?(editingEntry?"Edit owner income or commission":"Add owner income or commission"):"Record incoming payment"}</h2><p className="mt-1 text-xs text-slate-500">{modal==="entry"?(editingEntry?"Update the entry details. Received payments are retained.":"Create a new income register entry."):"Record all or part of the outstanding balance."}</p></div><button onClick={()=>setModal(null)} aria-label="Close dialog" className="rounded-lg p-2 hover:bg-slate-100"><X size={18}/></button></div>
      {modal==="entry" ? <form onSubmit={submitEntry} className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Record type"><select value={entryForm.entry_type} onChange={e=>setEntryForm({...entryForm,entry_type:e.target.value})} className={inputClass}><option value="owner_income">Owner income</option><option value="commission">Commission</option></select></Field>
        <Field label="Recipient"><select value={entryForm.recipient} onChange={e=>setEntryForm({...entryForm,recipient:e.target.value})} className={inputClass}><option value="owner">Owner</option><option value="business">Business</option></select></Field>
        <Field label="Category"><input required value={entryForm.category} onChange={e=>setEntryForm({...entryForm,category:e.target.value})} placeholder="Salary, allowance, sales commission…" className={inputClass}/></Field>
        <Field label="Payer / source"><input required value={entryForm.payer} onChange={e=>setEntryForm({...entryForm,payer:e.target.value})} placeholder="Who owes or paid this income?" className={inputClass}/></Field>
        <Field label="Description" wide><input required value={entryForm.description} onChange={e=>setEntryForm({...entryForm,description:e.target.value})} className={inputClass}/></Field>
        <Field label="Earned date"><input required type="date" value={entryForm.earned_date} onChange={e=>setEntryForm({...entryForm,earned_date:e.target.value})} className={inputClass}/></Field>
        <Field label="Expected payment date"><input type="date" value={entryForm.expected_payment_date} onChange={e=>setEntryForm({...entryForm,expected_payment_date:e.target.value})} className={inputClass}/></Field>
        <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={entryForm.amount} onChange={e=>setEntryForm({...entryForm,amount:e.target.value})} className={inputClass}/></Field>
        <Field label="Currency"><select value={entryForm.currency} onChange={e=>setEntryForm({...entryForm,currency:e.target.value})} className={inputClass}><option>UGX</option><option>USD</option><option>KES</option><option>TZS</option><option>RWF</option></select></Field>
        <Field label="Notes" wide><textarea rows={2} value={entryForm.notes} onChange={e=>setEntryForm({...entryForm,notes:e.target.value})} className={inputClass}/></Field>
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving?"Saving…":editingEntry?"Save changes":"Save record"}</button></div>
      </form> : <form onSubmit={submitPayment} className="grid gap-4 p-5 sm:grid-cols-2">
        {selected && <div className="rounded-xl bg-slate-50 p-4 text-sm sm:col-span-2"><div className="font-semibold">{selected.category} — {selected.payer}</div><div className="mt-1 text-slate-500">Outstanding: {money(Math.max(0,Number(selected.amount)-Number(selected.amount_received)),selected.currency)}</div></div>}
        <Field label="Payment date"><input required type="date" value={paymentForm.payment_date} onChange={e=>setPaymentForm({...paymentForm,payment_date:e.target.value})} className={inputClass}/></Field>
        <Field label="Amount received"><input required type="number" min="0.01" step="0.01" max={selected?Math.max(0,Number(selected.amount)-Number(selected.amount_received)):undefined} value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:e.target.value})} className={inputClass}/></Field>
        <Field label="Payment currency"><input value={paymentForm.currency} readOnly aria-readonly="true" className={inputClass+" bg-slate-100 text-slate-600"} /><span className="mt-1 block text-xs text-slate-500">Must match the currency of the selected income record.</span></Field>
        <Field label="Payment method"><select value={paymentForm.payment_method} onChange={e=>setPaymentForm({...paymentForm,payment_method:e.target.value})} className={inputClass}>{["cash","bank_transfer","mobile_money","card","cheque","other"].map(m=><option key={m} value={m}>{m.replace("_"," ")}</option>)}</select></Field>
        <Field label="Transaction reference"><input value={paymentForm.payment_reference} onChange={e=>setPaymentForm({...paymentForm,payment_reference:e.target.value})} className={inputClass}/></Field>
        <Field label="Notes"><input value={paymentForm.notes} onChange={e=>setPaymentForm({...paymentForm,notes:e.target.value})} className={inputClass}/></Field>
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={()=>setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving?"Recording…":"Record payment"}</button></div>
      </form>}
    </section></div>}
  </div>;
}
const inputClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-50";
function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) { return <label className={`block text-sm font-medium text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>; }
function Summary({ title, value, detail }: { title: string; value: string; detail: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-3 break-words text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>; }
