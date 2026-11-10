"use client";
import "../finance.css";
import Link from "next/link";
import { CalendarDays, CreditCard, FileBarChart, FilePlus2, FileText, LayoutDashboard, Package, Receipt, Settings, UsersRound, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const financeNavigation = [
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

function FinancePageSidebar({ activeHref }: { activeHref: string }) {
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span>
        <span><span className="block font-bold tracking-wide">JOHDEN</span><span className="mt-0.5 block text-xs text-slate-500">Business Consultancy &amp; Finance</span></span>
      </Link>
      <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {financeNavigation.map((item) => { const Icon = item.icon; const active = item.href === activeHref; return <Link key={item.label} href={item.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active ? "bg-rose-50 text-slate-900" : "text-slate-700 hover:bg-slate-50 hover:text-[#F3192D]"}`}><Icon size={19} className={active ? "text-[#F3192D]" : "text-slate-700"}/><span className="flex-1">{item.label}</span>{active && <span className="h-1.5 w-1.5 rounded-full bg-[#F3192D]"/>}</Link>; })}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-400">Johden Business Suite</div>
    </aside>
    <nav aria-label="Workspace navigation" className="mb-4 flex flex-wrap gap-2 md:hidden">
      {financeNavigation.map((item) => <Link key={item.label} href={item.href} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${item.href === activeHref ? "border-rose-200 bg-rose-50 text-[#F3192D]" : "border-slate-200 bg-white text-slate-700"}`}>{item.label}</Link>)}
    </nav>
  </>;
}

type Supplier = { id: string; name: string };
type Expense = { id: string; expense_date: string; category: string; description: string; supplier_contact_id?: string | null; supplier_name?: string | null; amount: number; currency: string; payment_method?: string | null; notes?: string | null };
const methods = [{ value: "cash", label: "Cash" }, { value: "bank_transfer", label: "Bank transfer" }, { value: "mobile_money", label: "Mobile money" }, { value: "card", label: "Card" }, { value: "cheque", label: "Cheque" }, { value: "other", label: "Other" }];
const money = (amount: number, currency = "UGX") => `${currency} ${Number(amount || 0).toLocaleString("en-UG", { maximumFractionDigits: 2 })}`;
export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null); const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState(""); const [period, setPeriod] = useState("all"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [showForm, setShowForm] = useState(false); const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null); const [detailExpense, setDetailExpense] = useState<Expense | null>(null); const [recurringExpense, setRecurringExpense] = useState<Expense | null>(null); const [recurringFrequency, setRecurringFrequency] = useState("monthly"); const [recurringNextDate, setRecurringNextDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); const [recurringEndDate, setRecurringEndDate] = useState(""); const [recurringBusy, setRecurringBusy] = useState(false);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().slice(0, 10), category: "", description: "", supplier_contact_id: "", amount: "", currency: "UGX", payment_method: "bank_transfer", notes: "" });
  const load = useCallback(async () => { const [er, sr] = await Promise.all([fetch("/api/saas/expenses", { cache: "no-store" }), fetch("/api/saas/suppliers", { cache: "no-store" })]); const ed = await er.json(); const sd = await sr.json(); if (!er.ok) throw new Error(ed.error || "Unable to load expenses."); if (!sr.ok) throw new Error(sd.error || "Unable to load suppliers."); setExpenses(Array.isArray(ed.expenses) ? ed.expenses : []); setSuppliers(Array.isArray(sd.suppliers) ? sd.suppliers : []); }, []);
  useEffect(() => { load().catch(e => setMessage(e instanceof Error ? e.message : "Unable to load records.")); }, [load]);
  const visible = useMemo(() => expenses.filter(x => { const q = search.toLowerCase(); const matches = `${x.category} ${x.description} ${x.supplier_name || ""} ${x.payment_method || ""}`.toLowerCase().includes(q); const now = new Date(); const d = new Date(`${x.expense_date}T00:00:00`); const dateMatch = period === "all" || (period === "month" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) || (period === "year" && d.getFullYear() === now.getFullYear()); return matches && dateMatch; }), [expenses, search, period]);
  const selectedExpense = visible.find((expense) => expense.id === selectedExpenseId) || visible[0] || null;
  const total = visible.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const amountValue = Number(form.amount);
    if (!form.expense_date) { setMessage("Choose the expense date."); return; }
    if (!form.category.trim()) { setMessage("Enter an expense category."); return; }
    if (!form.description.trim()) { setMessage("Enter a description for this expense."); return; }
    if (!Number.isFinite(amountValue) || amountValue <= 0) { setMessage("Expense amount must be a valid amount greater than zero."); return; }
    if (!form.currency.trim()) { setMessage("Choose the expense currency."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/saas/expenses", {
        method: editingExpenseId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          category: form.category.trim(),
          description: form.description.trim(),
          ...(editingExpenseId ? { id: editingExpenseId } : {}),
          amount: amountValue,
          currency: form.currency.trim().toUpperCase(),
          supplier_contact_id: form.supplier_contact_id || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || (editingExpenseId ? "Could not update expense." : "Could not save expense."));
      setMessage(editingExpenseId ? "Expense updated successfully." : "Expense saved successfully.");
      setForm(s => ({ ...s, category: "", description: "", supplier_contact_id: "", amount: "", notes: "" }));
      setEditingExpenseId(null);
      setShowForm(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save expense.");
    } finally {
      setBusy(false);
    }
  }
  function editExpense(x: Expense) { setEditingExpenseId(x.id); setForm({ expense_date: x.expense_date, category: x.category || "", description: x.description || "", supplier_contact_id: x.supplier_contact_id || "", amount: String(x.amount ?? ""), currency: x.currency || "UGX", payment_method: x.payment_method || "bank_transfer", notes: x.notes || "" }); setMessage(""); setShowForm(true); }
  async function deleteExpense(x: Expense) { if (!window.confirm("Delete this expense record? Linked supplier payment history will be protected.")) return; setMessage(""); try { const r = await fetch("/api/saas/expenses?id=" + encodeURIComponent(x.id), { method: "DELETE" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not delete expense."); setMessage("Expense deleted."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not delete expense."); } }
  async function makeRecurring(e: FormEvent) {
    e.preventDefault();
    if (!recurringExpense) return;
    setRecurringBusy(true); setMessage("");
    try {
      const response = await fetch("/api/finance/recurring-expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recurringExpense.description.slice(0, 150),
          category: recurringExpense.category,
          description: recurringExpense.description,
          amount: Number(recurringExpense.amount),
          currency: recurringExpense.currency || "UGX",
          exchange_rate: 1,
          payment_method: recurringExpense.payment_method || "other",
          supplier_contact_id: recurringExpense.supplier_contact_id || null,
          notes: recurringExpense.notes || null,
          frequency: recurringFrequency,
          next_run_date: recurringNextDate,
          end_date: recurringEndDate || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create recurring expense schedule.");
      setMessage("Recurring expense schedule created successfully.");
      setRecurringExpense(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create recurring expense schedule."); }
    finally { setRecurringBusy(false); }
  }
  return <div className="min-h-screen bg-[#F7F8FA] text-slate-900"><FinancePageSidebar activeHref="/workspace/finance/expenses"/><main className="jbcs-finance-page md:ml-[264px] jbcs-finance-consistent-main"><div className="jbcs-finance-top"><Link href="/workspace/finance">← Finance overview</Link><span>JOHDEN BUSINESS SUITE</span></div><header className="jbcs-finance-heading"><div><p className="jbcs-eyebrow">FINANCE / COST CONTROL</p><h1>Expenses</h1><p>Record business costs, assign suppliers and keep your expense history organised.</p></div><div className="jbcs-page-actions"><button type="button" className="jbcs-primary-button" onClick={() => { if (showForm) { setShowForm(false); setEditingExpenseId(null); } else { setEditingExpenseId(null); setForm(s => ({ ...s, expense_date: new Date().toISOString().slice(0, 10), category: "", description: "", supplier_contact_id: "", amount: "", notes: "" })); setShowForm(true); } }}>{showForm ? "Close form" : "Record expense"}</button></div></header>
  {message && <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.toLowerCase().includes("success") || message.toLowerCase().includes("deleted") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{message}</div>}
  {recurringExpense && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="recurring-expense-title"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="jbcs-eyebrow">RECURRING EXPENSE</p><h2 id="recurring-expense-title" className="text-xl font-bold">Schedule “{recurringExpense.description}”</h2><p className="mt-1 text-sm text-slate-500">This creates a schedule; it does not duplicate the current expense immediately.</p></div><button type="button" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100" onClick={() => setRecurringExpense(null)} aria-label="Close">✕</button></div><form className="grid gap-4 sm:grid-cols-2" onSubmit={makeRecurring}><label className="grid gap-1 text-sm font-semibold">Frequency<select required className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringFrequency} onChange={e => setRecurringFrequency(e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label className="grid gap-1 text-sm font-semibold">First scheduled date<input required type="date" className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringNextDate} onChange={e => setRecurringNextDate(e.target.value)} /></label><label className="grid gap-1 text-sm font-semibold sm:col-span-2">End date (optional)<input type="date" min={recurringNextDate} className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} /></label><div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setRecurringExpense(null)}>Cancel</button><button disabled={recurringBusy} className="jbcs-primary-button">{recurringBusy ? "Saving schedule…" : "Save recurring schedule"}</button></div></form></section></div>}
  <div className="jbcs-stat-grid"><article><span>Records shown</span><strong>{visible.length}</strong><small>Based on current filters</small></article><article><span>Total shown</span><strong>{money(total)}</strong><small>Mixed currencies are not converted</small></article><article><span>Supplier-linked</span><strong>{visible.filter(x => x.supplier_contact_id).length}</strong><small>Expenses assigned to a supplier</small></article></div>
  <div className="jbcs-finance-columns">{showForm && <div className="fixed inset-0 z-50 flex justify-end overflow-y-auto bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="expense-entry-title" onMouseDown={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditingExpenseId(null); } }}><section className="jbcs-panel jbcs-entry-panel min-h-screen w-full max-w-2xl overflow-y-auto rounded-l-2xl bg-white shadow-2xl"><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">{editingExpenseId ? "EDIT ENTRY" : "NEW ENTRY"}</p><h2 id="expense-entry-title">{editingExpenseId ? "Edit expense" : "Record an expense"}</h2></div><button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => { setShowForm(false); setEditingExpenseId(null); }}>Close</button></div><form className="jbcs-form-grid" onSubmit={save}><label>Expense date<input type="date" required value={form.expense_date} onChange={e => setForm(s => ({ ...s, expense_date: e.target.value }))}/></label><label>Category<input required maxLength={100} placeholder="e.g. Transport" value={form.category} onChange={e => setForm(s => ({ ...s, category: e.target.value }))}/></label><label className="jbcs-span-2">Description<input required maxLength={500} placeholder="What was the expense for?" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))}/></label><label>Supplier (optional)<select value={form.supplier_contact_id} onChange={e => setForm(s => ({ ...s, supplier_contact_id: e.target.value }))}><option value="">No supplier selected</option>{suppliers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e => setForm(s => ({ ...s, amount: e.target.value }))}/></label><label>Currency<input required minLength={3} maxLength={3} value={form.currency} onChange={e => setForm(s => ({ ...s, currency: e.target.value.toUpperCase() }))}/></label><label>Payment method<select required value={form.payment_method} onChange={e => setForm(s => ({ ...s, payment_method: e.target.value }))}>{methods.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label><label className="jbcs-span-2">Notes<textarea rows={3} maxLength={2000} placeholder="Optional reference or additional details" value={form.notes} onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}/></label><div className="jbcs-span-2"><button className="jbcs-primary-button" disabled={busy}>{busy ? "Saving…" : editingExpenseId ? "Save changes" : "Save expense"}</button></div></form>{message && <p className={message.toLowerCase().includes("success") ? "jbcs-message success" : "jbcs-message"} role="status">{message}</p>}</section></div>}
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">All Expenses <span className="text-sm font-medium text-slate-400">({visible.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select an expense to view details and actions.</p></div><button type="button" onClick={()=>{setShowForm(true);setEditingExpenseId(null);}} className="rounded-lg bg-[#F3192D] px-4 py-2 text-sm font-semibold text-white">+ Record expense</button></div><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><input aria-label="Search expenses" placeholder="Search category, supplier…" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-[210px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"/><select aria-label="Filter by period" value={period} onChange={e=>setPeriod(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All dates</option><option value="month">This month</option><option value="year">This year</option></select></div><div className="grid min-h-[620px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expense register</span><span className="text-xs text-slate-400">{visible.length} records</span></div><div className="max-h-[700px] overflow-y-auto">{visible.length===0?<p className="p-6 text-sm text-slate-500">No expenses match these filters.</p>:visible.map(x=><button key={x.id} type="button" onClick={()=>setSelectedExpenseId(x.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left ${selectedExpense?.id===x.id?"bg-rose-50/80 ring-1 ring-inset ring-rose-100":"hover:bg-slate-50"}`}><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{x.description}</span><span className="whitespace-nowrap text-sm font-bold">{money(Number(x.amount),x.currency)}</span></span><span className="mt-1 block text-xs text-slate-500">{x.expense_date} · {x.category}</span><span className="mt-2 block text-xs text-slate-500">{x.supplier_name||"No supplier"} · {(x.payment_method||"—").replaceAll("_"," ")}</span></button>)}</div></aside><div className="min-w-0 bg-slate-50/70">{!selectedExpense?<div className="flex min-h-[450px] items-center justify-center p-8 text-sm text-slate-500">Select an expense to view its details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected expense</p><h2 className="mt-0.5 text-xl font-bold">{selectedExpense.description}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setDetailExpense(selectedExpense)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Preview</button><button type="button" onClick={()=>editExpense(selectedExpense)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Edit</button><button type="button" onClick={()=>{setRecurringExpense(selectedExpense);setRecurringFrequency("monthly");setRecurringNextDate(new Date(Date.now()+86400000).toISOString().slice(0,10));setRecurringEndDate("");}} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Make recurring</button><details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">••• More</summary><div className="absolute right-0 z-20 mt-1 min-w-40 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={()=>void deleteExpense(selectedExpense)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50">Delete expense</button></div></details></div></div><div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expense amount</p><p className="mt-2 text-2xl font-bold">{money(Number(selectedExpense.amount),selectedExpense.currency)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p><p className="mt-2 font-semibold">{selectedExpense.expense_date||"—"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</p><p className="mt-2 font-semibold">{selectedExpense.supplier_name||"—"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category / payment method</p><p className="mt-2 font-semibold">{selectedExpense.category||"—"} · {(selectedExpense.payment_method||"—").replaceAll("_"," ")}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedExpense.notes||"No notes recorded."}</p></div></div></div></>}</div></div></section></div>{detailExpense && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="expense-detail-title" onMouseDown={e => { if (e.target === e.currentTarget) setDetailExpense(null); }}><section className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Expense record</p><h2 id="expense-detail-title" className="mt-2 text-xl font-bold">{detailExpense.description}</h2><p className="mt-1 text-sm text-slate-500">{detailExpense.expense_date}</p></div><button type="button" onClick={() => setDetailExpense(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Close</button></div><div className="mt-6 grid grid-cols-2 gap-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Amount</p><p className="mt-2 text-lg font-bold">{money(Number(detailExpense.amount), detailExpense.currency)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Category</p><p className="mt-2 font-semibold">{detailExpense.category || "—"}</p></div><div><p className="text-xs text-slate-500">Supplier</p><p className="mt-1 font-semibold">{detailExpense.supplier_name || "Not linked"}</p></div><div><p className="text-xs text-slate-500">Payment method</p><p className="mt-1 font-semibold">{(detailExpense.payment_method || "—").replaceAll("_", " ")}</p></div><div className="col-span-2"><p className="text-xs text-slate-500">Notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{detailExpense.notes || "No notes recorded."}</p></div></div><div className="mt-8 flex flex-wrap gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => { editExpense(detailExpense); setDetailExpense(null); }} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white">Edit expense</button><button type="button" onClick={() => { const item = detailExpense; setDetailExpense(null); void deleteExpense(item); }} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700">Delete expense</button><button type="button" onClick={() => { setRecurringExpense(detailExpense); setDetailExpense(null); setRecurringFrequency("monthly"); setRecurringNextDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); setRecurringEndDate(""); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Make recurring</button></div></section></div>}</main></div>;
}
