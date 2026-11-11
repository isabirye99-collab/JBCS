"use client";

import FinanceSidebar from "@/components/finance/FinanceSidebar";
// Keep the client directive as the first statement in this interactive workspace page.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { LayoutDashboard, UsersRound, Package, FileText, FilePlus2, Receipt, CreditCard, Search, Plus, Trash2, Printer, X, Send, CheckCircle2, ArrowRightLeft, Wallet, FileBarChart, Settings } from "lucide-react";

type Customer = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_number?: string | null;
};

type CatalogItem = {
  id: string;
  item_code?: string | null;
  name: string;
  description?: string | null;
  item_type?: string | null;
  unit_price?: number | string | null;
  currency?: string | null;
  tax_rate?: number | string | null;
  is_active?: boolean;
};

type QuoteLine = {
  key: string;
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
};

type SavedQuoteItem = {
  id?: string;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  tax_rate?: number | string | null;
  line_total?: number | string | null;
};

type Quote = {
  id: string;
  quote_number?: string | null;
  contact_id?: string | null;
  issue_date?: string | null;
  valid_until?: string | null;
  currency?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  total?: number | string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  business_contacts?: { name?: string | null; email?: string | null; phone?: string | null; address?: string | null } | null;
  document_items?: SavedQuoteItem[];
};

const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS", "RWF"];
const BRAND = "#F3192D";

function money(value: unknown, currency = "UGX") {
  const amount = Number(value ?? 0);
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "UGX" ? 0 : 2,
    }).format(Number.isFinite(amount) ? amount : 0);
  } catch {
    return `${currency} ${Number.isFinite(amount) ? amount.toLocaleString() : "0"}`;
  }
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function printDocument(documentNumber: string) {
  const previousTitle = document.title;
  const safeName = documentNumber.trim().replace(/[^a-zA-Z0-9 -]/g, "").replace(/\s+/g, "-");
  document.title = safeName || "JBCS-Quotation";
  window.print();
  window.setTimeout(() => { document.title = previousTitle; }, 1500);
}

function makeLine(): QuoteLine {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, description: "", quantity: "1", unit_price: "0", tax_rate: "0" };
}

function quoteTotal(quote: Quote) {
  return Number(quote.total ?? quote.subtotal ?? 0);
}

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

export default function QuotesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([makeLine()]);
  const [printQuote, setPrintQuote] = useState<Quote | null>(null);
  const [detailQuote, setDetailQuote] = useState<Quote | null>(null);
  const [quoteActionBusy, setQuoteActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [quoteRes, customerRes, itemRes] = await Promise.all([
        fetch("/api/saas/quotes", { cache: "no-store" }),
        fetch("/api/saas/customers", { cache: "no-store" }),
        fetch("/api/saas/items", { cache: "no-store" }),
      ]);
      const [quoteData, customerData, itemData] = await Promise.all([
        quoteRes.json(), customerRes.json(), itemRes.json(),
      ]);
      if (!quoteRes.ok) throw new Error(quoteData.error || "Could not load quotations.");
      if (!customerRes.ok) throw new Error(customerData.error || "Could not load customers.");
      if (!itemRes.ok) throw new Error(itemData.error || "Could not load Products & Services.");
      setQuotes(Array.isArray(quoteData.quotes) ? quoteData.quotes : []);
      setCustomers(Array.isArray(customerData.customers) ? customerData.customers : []);
      setCatalog(Array.isArray(itemData.items) ? itemData.items.filter((item: CatalogItem) => item.is_active !== false) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load quotations workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lineTotals = useMemo(() => lines.map((line) => {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const price = Math.max(0, Number(line.unit_price) || 0);
    const rate = Math.min(100, Math.max(0, Number(line.tax_rate) || 0));
    const base = quantity * price;
    return { base, tax: base * rate / 100, total: base * (1 + rate / 100) };
  }), [lines]);

  const subtotal = lineTotals.reduce((sum, line) => sum + line.base, 0);
  const taxTotal = lineTotals.reduce((sum, line) => sum + line.tax, 0);
  const grandTotal = subtotal + taxTotal;

  const filteredQuotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotes.filter((quote) => {
      const number = (quote.quote_number || "").toLowerCase();
      const customer = (quote.business_contacts?.name || "").toLowerCase();
      const status = (quote.status || "draft").toLowerCase();
      const matchesSearch = !q || number.includes(q) || customer.includes(q);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes, search, statusFilter]);
  const selectedQuote = filteredQuotes.find((quote) => quote.id === selectedQuoteId) || filteredQuotes[0] || null;

  function updateLine(key: string, patch: Partial<QuoteLine>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
  }

  function selectCatalogItem(key: string, itemId: string) {
    const item = catalog.find((candidate) => candidate.id === itemId);
    if (!item) {
      updateLine(key, { catalog_item_id: undefined });
      return;
    }
    updateLine(key, {
      catalog_item_id: item.id,
      description: item.description?.trim() ? `${item.name} — ${item.description}` : item.name,
      unit_price: String(item.unit_price ?? 0),
      tax_rate: String(item.tax_rate ?? 0),
    });
    if (item.currency && CURRENCIES.includes(item.currency.toUpperCase())) setCurrency(item.currency.toUpperCase());
  }

  async function createQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!customerId) { setError("Please select a customer."); return; }
    const validLines = lines.filter((line) => line.description.trim());
    if (!validLines.length) { setError("Add at least one service or quotation line."); return; }
    const items = validLines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unit_price: Number(line.unit_price),
      tax_rate: Number(line.tax_rate || 0),
    }));
    if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_price) || item.unit_price < 0 || !Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 100)) {
      setError("Check every line's quantity, price and tax rate.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/saas/quotes", {
        method: editingQuote ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(editingQuote ? { id: editingQuote.id } : {}), contact_id: customerId, valid_until: validUntil || null, currency, notes, items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Quotation could not be saved.");
      setNotice("Quotation " + (data.quote?.quote_number || "") + " was " + (editingQuote ? "updated" : "created") + " successfully.");
      setShowForm(false);
      setEditingQuote(null);
      setCustomerId("");
      setCurrency("UGX");
      setValidUntil("");
      setNotes("");
      setLines([makeLine()]);
      await load();
      if (data.quote) setPrintQuote({ ...data.quote, business_contacts: customers.find((customer) => customer.id === customerId) || null, document_items: Array.isArray(data.quote.document_items) ? data.quote.document_items : [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quotation could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updateQuoteStatus(quote: Quote, status: "sent" | "accepted" | "rejected") {
    setError(""); setNotice(""); setQuoteActionBusy(quote.id);
    try {
      const response = await fetch("/api/saas/quotes/status", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update quotation status.");
      setNotice(`Quotation ${quote.quote_number || ""} marked ${status}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update quotation status."); }
    finally { setQuoteActionBusy(null); }
  }

  async function convertAcceptedQuote(quote: Quote) {
    setError(""); setNotice(""); setQuoteActionBusy(quote.id);
    try {
      const response = await fetch("/api/saas/quotes/convert", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id, issue_date: today() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not convert quotation to invoice.");
      setNotice(`Quotation converted to invoice ${data.invoice?.invoice_number || "successfully"}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not convert quotation to invoice."); }
    finally { setQuoteActionBusy(null); }
  }

  const statusStyle = (status?: string | null) => {
    const s = (status || "draft").toLowerCase();
    if (s === "accepted" || s === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (s === "rejected" || s === "declined" || s === "expired") return "bg-rose-50 text-rose-700 ring-rose-200";
    if (s === "sent" || s === "issued") return "bg-blue-50 text-blue-700 ring-blue-200";
    return "bg-amber-50 text-amber-800 ring-amber-200";
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <FinanceSidebar activeHref="/workspace/finance/quotes" />

      <main className="jbcs-quotes-page min-w-0 px-4 py-5 sm:px-6 lg:px-8 md:ml-[264px] jbcs-finance-consistent-main">
        
        <div className="mx-auto max-w-[1440px] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Link href="/workspace/finance" className="text-sm font-semibold text-slate-500 hover:text-[#F3192D]">← Finance overview</Link>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-rose-100 bg-white p-1.5 shadow-sm"><img src="/johden-logo.svg" alt="Johden" className="h-full w-full object-contain" /></div>
                <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">Johden Business Suite</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Quotations</h1></div>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">Prepare service proposals, share pricing with customers and track quotation validity.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/workspace/finance/invoices" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-rose-200 hover:text-[#F3192D]">View invoices</Link>
              <button onClick={() => { setShowForm((value) => !value); setError(""); setNotice(""); }} className="inline-flex items-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#CF1022]"><Plus size={17} />{showForm ? "Close form" : "Create quotation"}</button>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

          {showForm && <form onSubmit={createQuote} className="jbcs-quote-entry space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div><h2 className="text-xl font-bold">{editingQuote ? "Edit quotation " + (editingQuote.quote_number || "") : "New quotation"}</h2><p className="mt-1 text-sm text-slate-500">Select a customer and add catalogue services or custom quotation lines.</p></div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#A80D1B]">Currency: {currency}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2"><span>Customer *</span><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name || "Unnamed customer"}{customer.email ? ` — ${customer.email}` : ""}</option>)}</select>{customers.length === 0 && <span className="block text-xs font-normal text-amber-700">No customers loaded yet. You can continue building the module and test customer selection later.</span>}</label>
              <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Valid until</span><input type="date" min={today()} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]" /></label>
              <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Currency</span><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]">{CURRENCIES.map((c) => <option key={c} value={c}>{c}{c === "UGX" ? " — Uganda Shillings" : ""}</option>)}</select></label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Service / description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit price</th><th className="px-3 py-3">Tax %</th><th className="px-3 py-3 text-right">Line total</th><th className="px-3 py-3"></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, index) => <tr key={line.key} className="align-top">
                    <td className="w-[42%] px-3 py-3">
                      <select aria-label={`Catalogue service for line ${index + 1}`} value={line.catalog_item_id || ""} onChange={(e) => selectCatalogItem(line.key, e.target.value)} className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#F3192D]"><option value="">Choose from Items &amp; Services (optional)</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.item_code ? `${item.item_code} — ` : ""}{item.name} ({item.currency || "UGX"} {Number(item.unit_price || 0).toLocaleString()})</option>)}</select>
                      <input required value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} placeholder="Service description" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#F3192D]" />
                    </td>
                    <td className="w-24 px-3 py-3"><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                    <td className="w-36 px-3 py-3"><input required type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(line.key, { unit_price: e.target.value })} className="w-32 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                    <td className="w-24 px-3 py-3"><input required type="number" min="0" max="100" step="0.01" value={line.tax_rate} onChange={(e) => updateLine(line.key, { tax_rate: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                    <td className="whitespace-nowrap px-3 py-4 text-right font-semibold">{money(lineTotals[index]?.total, currency)}</td>
                    <td className="px-3 py-3"><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))} aria-label="Remove line" className="rounded-lg px-2 py-2 text-slate-400 hover:bg-rose-50 hover:text-[#F3192D] disabled:opacity-30"><Trash2 size={16} /></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setLines((current) => [...current, makeLine()])} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-rose-200 hover:text-[#F3192D]">+ Add line</button>
              <div className="w-full max-w-sm space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{money(subtotal, currency)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Tax</span><span>{money(taxTotal, currency)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold"><span>Total</span><span className="text-[#F3192D]">{money(grandTotal, currency)}</span></div>
              </div>
            </div>
            <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Notes / terms</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Scope of work, delivery timeline, payment terms or other notes for the customer" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]" /></label>
            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => { setShowForm(false); setEditingQuote(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={saving || customers.length === 0} className="rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#CF1022] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving quotation…" : editingQuote ? "Save changes" : "Save quotation"}</button></div>
          </form>}

          <section className="jbcs-quotes-kpis grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Quotations in register</p><p className="mt-2 text-3xl font-bold">{quotes.length}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Total quoted value</p><p className="mt-2 text-2xl font-bold text-[#F3192D]">{money(quotes.reduce((sum, q) => sum + quoteTotal(q), 0), "UGX")}</p><p className="mt-1 text-xs text-slate-400">Shown as a simple total; mixed currencies should be reviewed separately.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Items &amp; Services available</p><p className="mt-2 text-3xl font-bold">{catalog.length}</p></div>
          </section>

          <section className="jbcs-quotes-register overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">All Quotations <span className="text-sm font-medium text-slate-400">({filteredQuotes.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select a quotation to preview details and actions.</p></div><div className="flex flex-wrap gap-2"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search customer or quotation…" aria-label="Search quotations" className="min-w-[210px] rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter quotation status" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="issued">Issued</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="expired">Expired</option></select></div></div>
            <div className="grid min-h-[650px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quotation register</span><span className="text-xs text-slate-400">{quotes.length} total</span></div><div className="max-h-[740px] overflow-y-auto">{loading?<p className="p-6 text-sm text-slate-500">Loading quotations…</p>:filteredQuotes.length===0?<p className="p-6 text-sm text-slate-500">No quotations match your search.</p>:filteredQuotes.map(quote=><button key={quote.id} type="button" onClick={()=>setSelectedQuoteId(quote.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left ${selectedQuote?.id===quote.id?"bg-rose-50/80 ring-1 ring-inset ring-rose-100":"hover:bg-slate-50"}`}><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{quote.business_contacts?.name||"Customer"}</span><span className="whitespace-nowrap text-sm font-semibold">{money(quote.total??quote.subtotal,quote.currency||"UGX")}</span></span><span className="mt-1.5 flex items-center justify-between gap-2"><span className="text-xs font-medium text-blue-600">{quote.quote_number||`Q-${quote.id.slice(0,8).toUpperCase()}`}</span><span className="text-xs text-slate-500">{quote.issue_date||quote.created_at?.slice(0,10)||"—"}</span></span><span className="mt-2 flex items-center justify-between gap-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset ${statusStyle(quote.status)}`}>{quote.status||"draft"}</span><span className="text-[10px] text-slate-500">Valid to {quote.valid_until||"—"}</span></span></button>)}</div><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {filteredQuotes.length} of {quotes.length} quotations</div></aside>
            <div className="min-w-0 bg-slate-50/70">{!selectedQuote?<div className="flex min-h-[500px] items-center justify-center p-8 text-center text-sm text-slate-500">Select a quotation to view its details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected quotation</p><h2 className="mt-0.5 text-xl font-bold">{selectedQuote.quote_number||`Q-${selectedQuote.id.slice(0,8).toUpperCase()}`}</h2></div><div className="flex flex-wrap gap-1.5"><button type="button" onClick={()=>setPrintQuote(selectedQuote)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:border-rose-200">Preview</button><button type="button" onClick={()=>setPrintQuote(selectedQuote)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:border-rose-200">PDF / Print</button><button type="button" onClick={()=>{setEditingQuote(selectedQuote);setCustomerId(selectedQuote.contact_id||"");setCurrency((selectedQuote.currency||"UGX").toUpperCase());setValidUntil(selectedQuote.valid_until||"");setNotes(selectedQuote.notes||"");setLines((selectedQuote.document_items||[]).length?(selectedQuote.document_items||[]).map(item=>({key:"edit-"+(item.id||Math.random().toString(36).slice(2)),description:item.description||"",quantity:String(item.quantity??1),unit_price:String(item.unit_price??0),tax_rate:String(item.tax_rate??0)})):[makeLine()]);setShowForm(true);setError("");setNotice("");window.scrollTo({top:0,behavior:"smooth"});}} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Edit</button><button type="button" onClick={()=>setDetailQuote(selectedQuote)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">View details</button>{String(selectedQuote.status||"draft").toLowerCase()==="draft"&&<button disabled={quoteActionBusy===selectedQuote.id} onClick={()=>void updateQuoteStatus(selectedQuote,"sent")} className="rounded-lg bg-[#F3192D] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Mark as sent</button>}{String(selectedQuote.status||"").toLowerCase()==="accepted"&&<button disabled={quoteActionBusy===selectedQuote.id} onClick={()=>void convertAcceptedQuote(selectedQuote)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Convert to invoice</button>}<details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold">••• More</summary><div className="absolute right-0 z-20 mt-1 min-w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"><button type="button" onClick={()=>setDetailQuote(selectedQuote)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">Full details</button></div></details></div></div><div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</p><p className="mt-2 text-lg font-bold">{selectedQuote.business_contacts?.name||"Customer"}</p><p className="mt-1 text-sm text-slate-500">{selectedQuote.business_contacts?.email||"—"}</p><p className="text-sm text-slate-500">{selectedQuote.business_contacts?.phone||"—"}</p></div><div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quotation total</p><p className="mt-2 text-2xl font-bold">{money(selectedQuote.total??selectedQuote.subtotal,selectedQuote.currency||"UGX")}</p><p className="mt-2 text-sm text-slate-500">Issue date: {selectedQuote.issue_date||"—"}</p><p className="text-sm text-slate-500">Valid until: {selectedQuote.valid_until||"—"}</p></div></div><div className="mt-7"><h3 className="font-bold">Line items</h3><div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{(selectedQuote.document_items||[]).map((item,i)=><tr key={item.id||i} className="border-t border-slate-100"><td className="p-3">{item.description||"Item"}</td><td className="p-3 text-right">{item.quantity??1}</td><td className="p-3 text-right">{money(item.unit_price,selectedQuote.currency||"UGX")}</td><td className="p-3 text-right">{money(item.line_total??Number(item.quantity??1)*Number(item.unit_price??0),selectedQuote.currency||"UGX")}</td></tr>)}{!(selectedQuote.document_items||[]).length&&<tr><td colSpan={4} className="p-4 text-center text-slate-500">No line-item details returned.</td></tr>}</tbody></table></div></div>{selectedQuote.notes&&<div className="mt-5"><h3 className="font-bold">Notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{selectedQuote.notes}</p></div>}</div></>}</div></div>
          </section>
        </div>
      </main>

      {printQuote && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Quotation preview">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 print:hidden"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">Johden Business Suite</p><h2 className="text-xl font-bold">Quotation preview</h2></div><button onClick={() => setPrintQuote(null)} aria-label="Close preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>
          <div id="quote-print-area" className="p-7 sm:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#F3192D] pb-6">
              <div><img src="/johden-logo.svg" alt="Johden Business Consultancy Services" className="mb-3 h-14 max-w-[240px] object-contain object-left"/><h1 className="text-2xl font-black tracking-wide">JOHDEN</h1><p className="text-sm text-slate-500">Strategy. Growth. Technology.</p></div>
              <div className="text-right"><h2 className="text-2xl font-bold">QUOTATION</h2><p className="mt-2 font-semibold">{printQuote.quote_number || `Q-${printQuote.id.slice(0, 8).toUpperCase()}`}</p><p className="mt-1 text-sm text-slate-500">Date: {printQuote.issue_date || (printQuote.created_at ? printQuote.created_at.slice(0, 10) : today())}</p><p className="text-sm text-slate-500">Valid until: {printQuote.valid_until || "As agreed"}</p></div>
            </div>
            <div className="grid gap-6 py-7 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Prepared for</p><p className="font-bold">{printQuote.business_contacts?.name || "Customer"}</p>{printQuote.business_contacts?.email && <p className="text-sm text-slate-600">{printQuote.business_contacts.email}</p>}{printQuote.business_contacts?.phone && <p className="text-sm text-slate-600">{printQuote.business_contacts.phone}</p>}{printQuote.business_contacts?.address && <p className="text-sm text-slate-600">{printQuote.business_contacts.address}</p>}</div><div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Quotation summary</p><p className="text-sm text-slate-600">Currency: {printQuote.currency || "UGX"}</p><p className="text-sm text-slate-600">Status: {printQuote.status || "Draft"}</p></div></div>
            <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Unit price</th><th className="px-3 py-3 text-right">Tax</th><th className="px-3 py-3 text-right">Line total</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(printQuote.document_items || []).map((item, index) => {
                    const qty = Number(item.quantity || 0); const price = Number(item.unit_price || 0); const rate = Number(item.tax_rate || 0);
                    const total = item.line_total == null ? qty * price * (1 + rate / 100) : Number(item.line_total);
                    return <tr key={item.id || `${item.description}-${index}`}><td className="px-3 py-3 font-medium text-slate-800">{item.description}</td><td className="px-3 py-3 text-right tabular-nums">{qty.toLocaleString()}</td><td className="px-3 py-3 text-right tabular-nums">{money(price, printQuote.currency || "UGX")}</td><td className="px-3 py-3 text-right tabular-nums">{rate}%</td><td className="px-3 py-3 text-right font-semibold tabular-nums">{money(total, printQuote.currency || "UGX")}</td></tr>;
                  })}
                  {(!printQuote.document_items || printQuote.document_items.length === 0) && <tr><td colSpan={5} className="px-3 py-5 text-center text-slate-500">No saved line items were returned for this quotation.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-5"><p className="text-sm text-slate-500">Quotation total</p><p className="mt-2 text-3xl font-black text-[#F3192D]">{money(printQuote.total ?? printQuote.subtotal, printQuote.currency || "UGX")}</p><div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2"><div className="flex justify-between gap-4"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{money(printQuote.subtotal, printQuote.currency || "UGX")}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Tax</span><span className="font-semibold">{money(printQuote.tax_amount, printQuote.currency || "UGX")}</span></div></div></div>
            {printQuote.notes && <div className="mt-6"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Notes and terms</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{printQuote.notes}</p></div>}
            <p className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">Thank you for considering Johden Business Consultancy Services.</p>

          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 print:hidden"><button onClick={() => setPrintQuote(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Close</button><button onClick={() => printDocument(printQuote.quote_number || `JBCS-Q-${printQuote.id.slice(0, 8).toUpperCase()}`)} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#CF1022]"><Printer size={15} className="mr-2 inline" />Print preview</button></div>
        </div>
      </div>}
      {detailQuote && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="quote-detail-title" onMouseDown={e => { if (e.target === e.currentTarget) setDetailQuote(null); }}><section className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Quotation details</p><h2 id="quote-detail-title" className="mt-2 text-xl font-bold">{detailQuote.quote_number || `Q-${detailQuote.id.slice(0,8).toUpperCase()}`}</h2><p className="mt-1 text-sm text-slate-500">{detailQuote.status || "draft"}</p></div><button type="button" onClick={() => setDetailQuote(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Close</button></div><div className="mt-6 grid grid-cols-2 gap-4"><div><p className="text-xs text-slate-500">Customer</p><p className="mt-1 font-semibold">{detailQuote.business_contacts?.name || "Customer"}</p><p className="text-sm text-slate-500">{detailQuote.business_contacts?.email || ""}</p><p className="text-sm text-slate-500">{detailQuote.business_contacts?.phone || ""}</p></div><div><p className="text-xs text-slate-500">Total</p><p className="mt-1 text-xl font-bold">{money(detailQuote.total ?? detailQuote.subtotal, detailQuote.currency || "UGX")}</p><p className="mt-2 text-xs text-slate-500">Issued: {detailQuote.issue_date || "—"} · Valid until: {detailQuote.valid_until || "—"}</p></div></div><div className="mt-7"><h3 className="font-bold">Line items</h3><div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-3">Description</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Unit price</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{(detailQuote.document_items || []).map((item, i) => <tr key={item.id || i} className="border-t border-slate-100"><td className="p-3">{item.description || "Item"}</td><td className="p-3 text-right">{item.quantity ?? 1}</td><td className="p-3 text-right">{money(item.unit_price, detailQuote.currency || "UGX")}</td><td className="p-3 text-right">{money(item.line_total ?? Number(item.quantity ?? 1) * Number(item.unit_price ?? 0), detailQuote.currency || "UGX")}</td></tr>)}{!(detailQuote.document_items || []).length && <tr><td colSpan={4} className="p-4 text-center text-slate-500">No line-item details returned for this quotation.</td></tr>}</tbody></table></div></div>{detailQuote.notes && <div className="mt-5"><h3 className="font-bold">Notes</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{detailQuote.notes}</p></div>}<div className="mt-7 flex gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => { setPrintQuote(detailQuote); setDetailQuote(null); }} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white">Preview / print</button><button type="button" onClick={() => setDetailQuote(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold">Close details</button></div></section></div>}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #quote-print-area, #quote-print-area * { visibility: visible !important; }
          #quote-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20mm !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
