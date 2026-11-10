"use client";


import "../finance.css";
import Link from "next/link";
import { LayoutDashboard, UsersRound, Package, FileText, FilePlus2, Receipt, CreditCard, Wallet, CalendarDays, FileBarChart, Settings, Printer, Eye, Send, Pencil, Trash2 , X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

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

type InvoiceLine = {
  key: string;
  catalog_item_id?: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
};

type Invoice = {
  id: string;
  invoice_number?: string | null;
  contact_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  total?: number | string | null;
  amount_paid?: number | string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  business_contacts?: { name?: string | null } | null;
  document_items?: { id: string; description?: string; quantity?: number; unit_price?: number; tax_rate?: number; line_total?: number }[];
};

const BRAND = "#F3192D";
const CURRENCIES = ["UGX", "USD", "EUR", "GBP", "KES", "TZS", "RWF"];

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

function localDate(date = new Date()) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

function today() {
  return localDate();
}

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDate(date);
}

function makeLine(): InvoiceLine {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, description: "", quantity: "1", unit_price: "0", tax_rate: "0" };
}

function invoiceTotal(invoice: Invoice) {
  return Number(invoice.total ?? invoice.subtotal ?? 0);
}

export default function InvoicesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [recurringInvoice, setRecurringInvoice] = useState<Invoice | null>(null);
  const [recurringFrequency, setRecurringFrequency] = useState("monthly");
  const [recurringNextDate, setRecurringNextDate] = useState(tomorrow());
  const [recurringEndDate, setRecurringEndDate] = useState("");
  const [recurringBusy, setRecurringBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [issueDate, setIssueDate] = useState(today());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([makeLine()]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [invoiceRes, customerRes, itemRes] = await Promise.all([
        fetch("/api/saas/invoices", { cache: "no-store" }),
        fetch("/api/saas/customers", { cache: "no-store" }),
        fetch("/api/saas/items", { cache: "no-store" }),
      ]);
      const [invoiceData, customerData, itemData] = await Promise.all([
        invoiceRes.json(), customerRes.json(), itemRes.json(),
      ]);
      if (!invoiceRes.ok) throw new Error(invoiceData.error || "Could not load invoices.");
      if (!customerRes.ok) throw new Error(customerData.error || "Could not load customers.");
      if (!itemRes.ok) throw new Error(itemData.error || "Could not load Products & Services.");
      setInvoices(Array.isArray(invoiceData.invoices) ? invoiceData.invoices : []);
      setCustomers(Array.isArray(customerData.customers) ? customerData.customers : []);
      setCatalog(Array.isArray(itemData.items) ? itemData.items.filter((item: CatalogItem) => item.is_active !== false) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load invoice workspace.");
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

  async function makeRecurringInvoice(e: FormEvent) {
    e.preventDefault();
    if (!recurringInvoice) return;
    if (!recurringInvoice.contact_id) { setError("This invoice has no linked customer, so it cannot be scheduled as recurring."); return; }
    const items = (recurringInvoice.document_items || []).map(item => ({
      description: item.description || "Invoice item",
      quantity: Number(item.quantity ?? 1),
      unit_price: Number(item.unit_price ?? 0),
      tax_rate: Number(item.tax_rate ?? 0)
    }));
    if (!items.length) { setError("This invoice has no line items available to copy into a recurring schedule."); return; }
    setRecurringBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/finance/recurring-invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: recurringInvoice.invoice_number || `Recurring invoice for ${recurringInvoice.business_contacts?.name || "customer"}`,
          contact_id: recurringInvoice.contact_id,
          currency: recurringInvoice.currency || "UGX",
          exchange_rate: 1,
          items,
          notes: recurringInvoice.notes || null,
          frequency: recurringFrequency,
          next_run_date: recurringNextDate,
          end_date: recurringEndDate || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create recurring invoice schedule.");
      setNotice("Recurring invoice schedule created successfully.");
      setRecurringInvoice(null);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not create recurring invoice schedule."); }
    finally { setRecurringBusy(false); }
  }

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const number = (invoice.invoice_number || "").toLowerCase();
      const customer = (invoice.business_contacts?.name || "").toLowerCase();
      const status = (invoice.status || "draft").toLowerCase();
      const matchesSearch = !q || number.includes(q) || customer.includes(q);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const selectedInvoice = useMemo(() => {
    return invoices.find((invoice) => invoice.id === selectedInvoiceId) || filteredInvoices[0] || null;
  }, [invoices, selectedInvoiceId, filteredInvoices]);

  useEffect(() => {
    if (selectedInvoiceId && !invoices.some((invoice) => invoice.id === selectedInvoiceId)) setSelectedInvoiceId(null);
    if (!selectedInvoiceId && filteredInvoices.length) setSelectedInvoiceId(filteredInvoices[0].id);
  }, [invoices, filteredInvoices, selectedInvoiceId]);

  function updateLine(key: string, patch: Partial<InvoiceLine>) {
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

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!customerId) { setError("Please select a customer."); return; }
    const validLines = lines.filter((line) => line.description.trim());
    if (!validLines.length) { setError("Add at least one service or invoice line."); return; }
    if (dueDate && dueDate < issueDate) { setError("The due date cannot be earlier than the issue date."); return; }
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
      const isEditing = Boolean(editingInvoiceId);
      const response = await fetch("/api/saas/invoices", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(isEditing ? { id: editingInvoiceId } : {}), contact_id: customerId, issue_date: issueDate, due_date: dueDate, currency, notes, items }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invoice could not be saved.");
      setNotice(isEditing ? `Draft ${data.invoice?.invoice_number || "invoice"} updated successfully.` : `Invoice ${data.invoice?.invoice_number || ""} was created successfully.`.trim());
      setShowForm(false);
      setEditingInvoiceId(null);
      setCustomerId("");
      setCurrency("UGX");
      setIssueDate(today());
      setDueDate("");
      setNotes("");
      setLines([makeLine()]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function editDraftInvoice(invoice: Invoice) {
    const status = (invoice.status || "draft").toLowerCase();
    if (!["draft", "sent", "issued", "overdue"].includes(status)) {
      setError("This invoice status cannot be edited. Paid or partially paid invoices are protected to preserve payment records.");
      return;
    }
    if (Number(invoice.amount_paid || 0) > 0) {
      setError("This invoice has a recorded payment and its financial details cannot be edited. Please use a credit note or adjustment so the payment history remains accurate.");
      return;
    }
    setEditingInvoiceId(invoice.id);
    setCustomerId(invoice.contact_id || "");
    setIssueDate(invoice.issue_date || today());
    setDueDate(invoice.due_date || "");
    setCurrency((invoice.currency || "UGX").toUpperCase());
    setNotes(invoice.notes || "");
    const existingLines = (invoice.document_items || []).map((item) => ({
      key: `${item.id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      description: item.description || "",
      quantity: String(item.quantity ?? 1),
      unit_price: String(item.unit_price ?? 0),
      tax_rate: String(item.tax_rate ?? 0),
    }));
    setLines(existingLines.length ? existingLines : [makeLine()]);
    setError(""); setNotice(""); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startNewInvoice() {
    setEditingInvoiceId(null);
    setCustomerId(""); setCurrency("UGX"); setIssueDate(today()); setDueDate(""); setNotes(""); setLines([makeLine()]);
    setError(""); setNotice(""); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function issueInvoice(invoice: Invoice) {
    if (!window.confirm(`Issue ${invoice.invoice_number || "this invoice"}? Its status will change from Draft to Sent.`)) return;
    setActionBusy(invoice.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices/issue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Invoice could not be issued.");
      setNotice(`${invoice.invoice_number || "Invoice"} issued successfully.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Invoice could not be issued."); }
    finally { setActionBusy(null); }
  }

  function openPayment(invoice: Invoice) {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(Math.max(0, invoiceTotal(invoice) - Number(invoice.amount_paid || 0))));
    setPaymentDate(today()); setPaymentMethod("bank_transfer");
    setPaymentReference(""); setPaymentNotes(""); setError(""); setNotice("");
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentInvoice) return;
    if (!paymentDate || paymentDate > today()) {
      setError("Choose a valid payment date that is not in the future.");
      return;
    }
    const balance = Math.max(0, invoiceTotal(paymentInvoice) - Number(paymentInvoice.amount_paid || 0));
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance + 0.000001) {
      setError(`Enter a payment greater than zero and no more than the outstanding balance (${money(balance, paymentInvoice.currency || "UGX")}).`);
      return;
    }
    setActionBusy(paymentInvoice.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: paymentInvoice.id, amount, payment_date: paymentDate,
          method: paymentMethod, payment_reference: paymentReference, notes: paymentNotes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Payment could not be recorded.");
      setNotice(`Payment recorded for ${paymentInvoice.invoice_number || "invoice"}.`);
      setPaymentInvoice(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Payment could not be recorded."); }
    finally { setActionBusy(null); }
  }

  async function deleteDraftInvoice(invoice: Invoice) {
    if ((invoice.status || "draft").toLowerCase() !== "draft") {
      setError("Only draft invoices can be deleted. Issued invoices are kept for audit history.");
      return;
    }
    if (!window.confirm(`Delete draft ${invoice.invoice_number || "invoice"}? This cannot be undone.`)) return;
    setActionBusy(invoice.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Draft invoice could not be deleted.");
      setNotice(`${invoice.invoice_number || "Draft invoice"} deleted.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Draft invoice could not be deleted."); }
    finally { setActionBusy(null); }
  }

  const statusStyle = (status?: string | null) => {
    const s = (status || "draft").toLowerCase();
    if (s === "paid") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (s === "overdue") return "bg-rose-50 text-rose-700 ring-rose-200";
    if (s === "cancelled" || s === "void") return "bg-slate-100 text-slate-600 ring-slate-200";
    if (s === "sent" || s === "issued") return "bg-blue-50 text-blue-700 ring-blue-200";
    return "bg-amber-50 text-amber-800 ring-amber-200";
  };

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

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span>
          <span className="min-w-0"><span className="block font-bold tracking-wide text-slate-900">JOHDEN</span><span className="mt-0.5 block text-xs leading-4 text-slate-500">Business Consultancy &amp; Finance</span></span>
        </Link>
        <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Invoices";
            return <Link key={item.label} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? "bg-rose-50 text-slate-900" : "text-slate-700 hover:bg-slate-50 hover:text-[#F3192D]"}`}>
              <Icon size={19} strokeWidth={1.9} className={active ? "text-[#F3192D]" : "text-slate-700"} />
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-[#F3192D]" />}
            </Link>;
          })}
        </nav>
        <div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-400">Johden Business Suite</div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 md:ml-[264px] jbcs-finance-consistent-main">
        <nav aria-label="Workspace navigation" className="mb-5 flex flex-wrap gap-2 md:hidden">
          {navigation.map((item) => <Link key={item.label} href={item.href} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${item.label === "Invoices" ? "border-rose-200 bg-rose-50 text-[#F3192D]" : "border-slate-200 bg-white text-slate-700"}`}>{item.label}</Link>)}
        </nav>
        <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/workspace/finance" className="text-sm font-semibold text-slate-500 hover:text-[#F3192D]">← Finance overview</Link>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3192D] text-lg font-black text-white shadow-sm">J</div>
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">Johden Business Suite</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Invoices</h1></div>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Create professional invoices, review outstanding balances and keep your customer billing organised.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/workspace/finance/quotes" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-rose-200 hover:text-[#F3192D]">View quotations</Link>
            <button onClick={() => { if (showForm) { setShowForm(false); setEditingInvoiceId(null); } else { startNewInvoice(); } }} className="rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#CF1022]">{showForm ? "Close form" : "+ Create invoice"}</button>
          </div>
        </div>

        {recurringInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="recurring-invoice-title"><section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold tracking-widest text-[#F3192D]">RECURRING INVOICE</p><h2 id="recurring-invoice-title" className="mt-1 text-xl font-bold">Schedule {recurringInvoice.invoice_number || "invoice"}</h2><p className="mt-1 text-sm text-slate-500">Copies this invoice’s customer and line items into a future schedule.</p></div><button type="button" className="rounded-lg px-3 py-1 text-slate-500 hover:bg-slate-100" onClick={() => setRecurringInvoice(null)} aria-label="Close">×</button></div><form className="grid gap-4 sm:grid-cols-2" onSubmit={makeRecurringInvoice}><label className="grid gap-1 text-sm font-semibold">Frequency<select required className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringFrequency} onChange={e => setRecurringFrequency(e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label><label className="grid gap-1 text-sm font-semibold">First scheduled date<input required type="date" className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringNextDate} onChange={e => setRecurringNextDate(e.target.value)} /></label><label className="grid gap-1 text-sm font-semibold sm:col-span-2">End date (optional)<input type="date" min={recurringNextDate} className="rounded-lg border border-slate-200 p-3 font-normal" value={recurringEndDate} onChange={e => setRecurringEndDate(e.target.value)} /></label><div className="flex justify-end gap-3 sm:col-span-2"><button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setRecurringInvoice(null)}>Cancel</button><button disabled={recurringBusy} className="rounded-lg bg-[#F3192D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{recurringBusy ? "Saving schedule…" : "Save recurring schedule"}</button></div></form></section></div>}
{error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        {paymentInvoice && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="record-payment-title">
          <section className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#F3192D]">Receive payment</p><h2 id="record-payment-title" className="mt-1 text-xl font-bold">{paymentInvoice.invoice_number || "Invoice"}</h2><p className="mt-1 text-sm text-slate-500">Outstanding: {money(Math.max(0, invoiceTotal(paymentInvoice) - Number(paymentInvoice.amount_paid || 0)), paymentInvoice.currency || "UGX")}</p></div><button type="button" onClick={() => setPaymentInvoice(null)} aria-label="Close payment form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div>
            <form onSubmit={submitPayment} className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Amount received<input required type="number" min="0.01" step="0.01" max={Math.max(0, invoiceTotal(paymentInvoice) - Number(paymentInvoice.amount_paid || 0))} value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"/></label>
              <label className="grid gap-1 text-sm font-semibold">Payment date<input required type="date" max={today()} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"/></label>
              <label className="grid gap-1 text-sm font-semibold">Method<select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
              <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Reference (optional)<input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} maxLength={120} className="rounded-xl border border-slate-200 px-3 py-3 font-normal" placeholder="Transaction or receipt reference"/></label>
              <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Notes (optional)<textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} maxLength={1000} rows={2} className="rounded-xl border border-slate-200 px-3 py-3 font-normal"/></label>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 sm:col-span-2"><button type="button" onClick={() => setPaymentInvoice(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={actionBusy === paymentInvoice.id} className="rounded-xl bg-[#F3192D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{actionBusy === paymentInvoice.id ? "Recording…" : "Record payment"}</button></div>
            </form>
          </section>
        </div>}

        {showForm && <form onSubmit={createInvoice} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div><h2 className="text-xl font-bold">{editingInvoiceId ? "Edit invoice" : "New invoice"}</h2><p className="mt-1 text-sm text-slate-500">{editingInvoiceId ? "Update invoice details. Invoices with recorded payments are protected." : "Choose a customer and add services from your catalogue or enter a custom line."}</p></div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-[#A80D1B]">Currency: {currency}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700 sm:col-span-2"><span>Customer *</span><select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]"><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name || "Unnamed customer"}{customer.email ? ` — ${customer.email}` : ""}</option>)}</select>{customers.length === 0 && <span className="block text-xs font-normal text-amber-700">No customers loaded. Add a customer first or check the customer access restriction.</span>}</label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Issue date *</span><input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]" /></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Due date</span><input type="date" min={issueDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]" /></label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700"><span>Invoice currency</span><select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-[#F3192D]">{CURRENCIES.map((c) => <option key={c} value={c}>{c}{c === "UGX" ? " — Uganda Shillings" : ""}</option>)}</select></label>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Service / description</th><th className="px-3 py-3">Qty</th><th className="px-3 py-3">Unit price</th><th className="px-3 py-3">Tax %</th><th className="px-3 py-3 text-right">Line total</th><th className="px-3 py-3"></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, index) => <tr key={line.key} className="align-top">
                  <td className="w-[42%] px-3 py-3">
                    <select aria-label={`Catalogue service for line ${index + 1}`} value={line.catalog_item_id || ""} onChange={(e) => selectCatalogItem(line.key, e.target.value)} className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-[#F3192D]"><option value="">Choose from Products & Services (optional)</option>{catalog.map((item) => <option key={item.id} value={item.id}>{item.item_code ? `${item.item_code} — ` : ""}{item.name} ({item.currency || "UGX"} {Number(item.unit_price || 0).toLocaleString()})</option>)}</select>
                    <input required value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} placeholder="Service description" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-[#F3192D]" />
                  </td>
                  <td className="w-24 px-3 py-3"><input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                  <td className="w-36 px-3 py-3"><input required type="number" min="0" step="0.01" value={line.unit_price} onChange={(e) => updateLine(line.key, { unit_price: e.target.value })} className="w-32 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                  <td className="w-24 px-3 py-3"><input required type="number" min="0" max="100" step="0.01" value={line.tax_rate} onChange={(e) => updateLine(line.key, { tax_rate: e.target.value })} className="w-20 rounded-lg border border-slate-200 px-2 py-2.5 outline-none focus:border-[#F3192D]" /></td>
                  <td className="whitespace-nowrap px-3 py-4 text-right font-semibold">{money(lineTotals[index]?.total, currency)}</td>
                  <td className="px-3 py-3"><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))} aria-label="Remove line" className="rounded-lg px-2 py-2 text-slate-400 hover:bg-rose-50 hover:text-[#F3192D] disabled:opacity-30">├ù</button></td>
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
          <label className="block space-y-1.5 text-sm font-semibold text-slate-700"><span>Notes / payment terms</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Payment instructions, scope of work or other notes for the customer" className="w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#F3192D]" /></label>
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => { setShowForm(false); setEditingInvoiceId(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button type="submit" disabled={saving || customers.length === 0} className="rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#CF1022] disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving invoice…" : editingInvoiceId ? "Save changes" : "Save invoice"}</button></div>
        </form>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-lg font-bold">All Invoices <span className="text-sm font-medium text-slate-400">({filteredInvoices.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select an invoice to preview its details and actions.</p></div>
            <div className="flex flex-wrap gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer or invoice…" aria-label="Search invoices" className="min-w-[210px] rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#F3192D]" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter invoices by status" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="issued">Issued</option><option value="part_paid">Partially paid</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option></select>
            </div>
          </div>
          <div className="grid min-h-[680px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice register</span><span className="text-xs text-slate-400">{invoices.length} total</span></div>
              <div className="max-h-[760px] overflow-y-auto">
                {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading invoices…</div> : filteredInvoices.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">No invoices match your search.</div> : filteredInvoices.map((invoice) => {
                  const total = invoiceTotal(invoice);
                  const paid = Number(invoice.amount_paid || 0);
                  const balance = Math.max(0, total - paid);
                  const status = (invoice.status || "draft").toLowerCase();
                  const active = selectedInvoice?.id === invoice.id;
                  const displayStatus = balance <= 0 && total > 0 ? "paid" : (paid > 0 && balance > 0 ? "partially paid" : status.replaceAll("_", " "));
                  return <button key={invoice.id} type="button" onClick={() => setSelectedInvoiceId(invoice.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition ${active ? "bg-rose-50/80 ring-1 ring-inset ring-rose-100" : "hover:bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{invoice.business_contacts?.name || "Customer"}</span><span className="whitespace-nowrap text-sm font-semibold text-slate-900">{money(total, invoice.currency || "UGX")}</span></div>
                    <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-xs font-medium text-blue-600">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}</span><span className="text-xs text-slate-500">{invoice.issue_date || invoice.created_at?.slice(0, 10) || "—"}</span></div>
                    <div className="mt-2 flex items-center justify-between gap-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1 ring-inset ${statusStyle(displayStatus)}`}>{displayStatus}</span>{balance > 0 && invoice.due_date && <span className="text-[10px] text-slate-500">Due {invoice.due_date}</span>}</div>
                  </button>;
                })}
              </div>
              <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {filteredInvoices.length} of {invoices.length} invoices</div>
            </aside>

            <div className="min-w-0 bg-slate-50/70">
              {!selectedInvoice ? <div className="flex min-h-[500px] flex-col items-center justify-center p-8 text-center"><FileText size={42} className="text-slate-300"/><h3 className="mt-4 text-lg font-semibold text-slate-700">Select an invoice</h3><p className="mt-1 text-sm text-slate-500">Choose an invoice from the list to see its preview.</p></div> : (() => {
                const invoice = selectedInvoice;
                const total = invoiceTotal(invoice);
                const paid = Number(invoice.amount_paid || 0);
                const balance = Math.max(0, total - paid);
                const rawStatus = (invoice.status || "draft").toLowerCase();
                const displayStatus = balance <= 0 && total > 0 ? "paid" : paid > 0 && balance > 0 ? "partially paid" : rawStatus.replaceAll("_", " ");
                const customer = customers.find((item) => item.id === invoice.contact_id) || customers.find((item) => item.name === invoice.business_contacts?.name);
                const linesForInvoice = invoice.document_items || [];
                return <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected invoice</p><h2 className="mt-0.5 text-xl font-bold">{invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}</h2></div><div className="flex flex-wrap gap-1.5"><Link href={`/workspace/invoices/${invoice.id}/print`} target="_blank" title="Preview invoice" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:border-rose-200 hover:text-[#F3192D]">Preview</Link><Link href={`/workspace/invoices/${invoice.id}/print`} target="_blank" title="Print or save as PDF" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:border-rose-200 hover:text-[#F3192D]">PDF / Print</Link><button type="button" disabled={actionBusy === invoice.id} onClick={() => void editDraftInvoice(invoice)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Edit</button>{rawStatus === "draft" && <button type="button" disabled={actionBusy === invoice.id} onClick={() => void issueInvoice(invoice)} className="rounded-lg bg-[#F3192D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#d41427] disabled:opacity-50">Mark as Sent</button>}{["sent","issued","partially_paid","part_paid","overdue"].includes(rawStatus) && balance > 0 && <button type="button" onClick={() => openPayment(invoice)} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Record payment</button>}
                    <details className="relative"><summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">••• More</summary><div className="absolute right-0 z-20 mt-1 min-w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{<button type="button" onClick={() => { setRecurringInvoice(invoice); setRecurringFrequency("monthly"); setRecurringNextDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); setRecurringEndDate(""); setError(""); }} className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-rose-50">Make recurring</button>}<Link href={`/workspace/invoices/${invoice.id}/print`} target="_blank" className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">Share / open printable copy</Link>{rawStatus === "draft" && <button type="button" disabled={actionBusy === invoice.id} onClick={() => void deleteDraftInvoice(invoice)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50">Delete draft</button>}</div></details>
                  </div>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-[900px] overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm">
                      <div className="relative min-h-[720px] p-6 sm:p-10 lg:p-12">
                        <div className={`absolute left-0 top-8 -translate-x-1 rotate-[-45deg] px-12 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm ${displayStatus === "paid" ? "bg-emerald-500" : displayStatus === "draft" ? "bg-slate-500" : displayStatus === "overdue" ? "bg-orange-500" : displayStatus === "partially paid" ? "bg-amber-500" : "bg-blue-500"}`}>{displayStatus}</div>
                        <div className="flex flex-col gap-8 pt-10 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-[55%]"><img src="/johden-logo.svg" alt="Johden Business Consultancy Services" className="mb-4 h-14 max-w-[220px] object-contain object-left"/><h3 className="text-base font-bold text-slate-900">Johden Business Consultancy Services</h3><p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">Uganda</p><p className="text-sm text-slate-600">isabirye99@gmail.com</p></div><div className="text-left sm:text-right"><h3 className="text-4xl font-light tracking-wide text-slate-700">INVOICE</h3><p className="mt-2 text-sm font-semibold">Invoice # {invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`}</p><div className="mt-6"><p className="text-xs text-slate-500">Balance Due</p><p className="mt-1 text-xl font-bold">{money(balance, invoice.currency || "UGX")}</p></div></div></div>
                        <div className="mt-12 grid gap-8 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Bill To</p><p className="font-semibold text-blue-600">{invoice.business_contacts?.name || customer?.name || "Customer"}</p>{customer?.address && <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{customer.address}</p>}{customer?.email && <p className="text-sm text-slate-600">{customer.email}</p>}{customer?.phone && <p className="text-sm text-slate-600">{customer.phone}</p>}</div><div className="space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">Invoice Date</span><span className="font-medium">{invoice.issue_date || "—"}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Terms</span><span className="font-medium">{invoice.due_date ? "Due on date shown" : "Due on receipt"}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Due Date</span><span className="font-medium">{invoice.due_date || "—"}</span></div></div></div>
                        <div className="mt-10 overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead className="bg-[#3d3d3a] text-white"><tr><th className="px-3 py-3 text-left">#</th><th className="px-3 py-3 text-left">Description</th><th className="px-3 py-3 text-right">Qty</th><th className="px-3 py-3 text-right">Rate</th><th className="px-3 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-200">{linesForInvoice.length ? linesForInvoice.map((line, index) => <tr key={line.id || index}><td className="px-3 py-3">{index + 1}</td><td className="px-3 py-3">{line.description || "Invoice item"}</td><td className="px-3 py-3 text-right">{Number(line.quantity ?? 1).toLocaleString()}</td><td className="px-3 py-3 text-right">{money(line.unit_price || 0, invoice.currency || "UGX")}</td><td className="px-3 py-3 text-right">{money(line.line_total ?? Number(line.quantity || 1) * Number(line.unit_price || 0), invoice.currency || "UGX")}</td></tr>) : <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">Line item details are not available in the invoice list. Open PDF / Print for the full document.</td></tr>}</tbody></table></div>
                        <div className="ml-auto mt-8 w-full max-w-sm space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-500">Subtotal</span><span>{money(invoice.subtotal ?? total, invoice.currency || "UGX")}</span></div><div className="flex justify-between gap-4"><span className="text-slate-500">Tax</span><span>{money(invoice.tax_amount || 0, invoice.currency || "UGX")}</span></div><div className="flex justify-between gap-4 border-t border-slate-200 pt-3 text-base font-bold"><span>Total</span><span>{money(total, invoice.currency || "UGX")}</span></div><div className="flex justify-between gap-4 text-slate-600"><span>Amount Paid</span><span>{money(paid, invoice.currency || "UGX")}</span></div><div className="flex justify-between gap-4 border-t border-slate-200 pt-3 font-bold"><span>Balance Due</span><span>{money(balance, invoice.currency || "UGX")}</span></div></div>
                        {invoice.notes && <div className="mt-10 border-t border-slate-200 pt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</p><p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{invoice.notes}</p></div>}
                        <div className="mt-12 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">Thank you for your business.</div>
                      </div>
                    </div>
                  </div>
                </div>
              })()}
            </div>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
