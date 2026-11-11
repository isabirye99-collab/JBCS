"use client";

import FinanceSidebar from "@/components/finance/FinanceSidebar";

import Link from "next/link";
import {
  Home, Users, Package, FileText, FileCheck, Receipt, ArrowLeftRight,
  TrendingUp, Truck, Wallet, BarChart3, Plus, Search, Upload, X,
  Pencil, Power, Boxes, Wrench, RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import "../finance.css";

type CatalogItem = {
  id: string;
  item_code?: string;
  name?: string;
  item_type?: "product" | "service";
  category?: string | null;
  unit?: string;
  unit_price?: number | string;
  currency?: string;
  tax_rate?: number | string;
  description?: string | null;
  tax_inclusive?: boolean;
  is_active?: boolean;
};
type ItemForm = {
  item_code: string; name: string; item_type: "product" | "service"; category: string;
  unit: string; unit_price: string; currency: string; tax_rate: string; description: string;
  tax_inclusive: boolean;
};
const EMPTY: ItemForm = { item_code: "", name: "", item_type: "service", category: "", unit: "unit", unit_price: "0", currency: "UGX", tax_rate: "0", description: "", tax_inclusive: false };
const NAV = [
  { label: "Dashboard", href: "/workspace/finance", icon: Home },
  { label: "Customers", href: "/workspace/finance/customers", icon: Users },
  { label: "Products & Services", href: "/workspace/finance/items", icon: Package },
  { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
  { label: "Quotes", href: "/workspace/finance/quotes", icon: FileCheck },
  { label: "Sales Receipts", href: "/workspace/finance/sales-receipts", icon: Receipt },
  { label: "Payments", href: "/workspace/finance/payments", icon: ArrowLeftRight },
  { label: "Expenses", href: "/workspace/finance/expenses", icon: TrendingUp },
  { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: Truck },
  { label: "Owner's Income & Commissions", href: "/workspace/finance/owner-income", icon: Wallet },
  { label: "Reports", href: "/workspace/finance/reports", icon: BarChart3 },
];
const money = (currency: string, value: number | string | undefined) => `${currency || "UGX"} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some((v) => v)) lines.push(row); row = []; cell = "";
    } else cell += ch;
  }
  row.push(cell.trim()); if (row.some((v) => v)) lines.push(row);
  if (lines.length < 2) return [];
  const headers = lines[0].map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
  return lines.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ""])));
}

export default function ProductsServicesPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/saas/items", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load the catalogue.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the catalogue."); setMessageType("error");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const activeItems = items.filter((item) => item.is_active !== false);
  const products = activeItems.filter((item) => item.item_type === "product").length;
  const services = activeItems.filter((item) => item.item_type === "service").length;
  const visibleItems = useMemo(() => items.filter((item) => {
    const haystack = `${item.item_code || ""} ${item.name || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.item_type === typeFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? item.is_active !== false : item.is_active === false);
    return matchesSearch && matchesType && matchesStatus;
  }), [items, search, typeFilter, statusFilter]);
  const selectedItem = visibleItems.find((item) => item.id === selectedItemId) || visibleItems[0] || null;

  function startNew() { setEditingId(null); setForm(EMPTY); setFormOpen(true); setImportOpen(false); setMessage(""); }
  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({ item_code: item.item_code || "", name: item.name || "", item_type: item.item_type || "service", category: item.category || "", unit: item.unit || "unit", unit_price: String(item.unit_price ?? 0), currency: item.currency || "UGX", tax_rate: String(item.tax_rate ?? 0), description: item.description || "", tax_inclusive: Boolean(item.tax_inclusive) });
    setFormOpen(true); setImportOpen(false); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const unitPrice = Number(form.unit_price);
    const taxRate = Number(form.tax_rate);
    if (!form.name.trim()) {
      setMessage("Enter a name for this product or service.");
      setMessageType("error");
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setMessage("Unit price must be a valid amount of zero or more.");
      setMessageType("error");
      return;
    }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      setMessage("Tax rate must be a valid percentage between 0 and 100.");
      setMessageType("error");
      return;
    }
    if (!["product", "service"].includes(form.item_type)) {
      setMessage("Choose whether this catalogue item is a product or service.");
      setMessageType("error");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        item_code: form.item_code.trim(),
        unit_price: unitPrice,
        tax_rate: taxRate,
        id: editingId || undefined,
      };
      const response = await fetch("/api/saas/items", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this catalogue item.");
      setMessage(editingId ? "Catalogue item updated." : "Catalogue item created.");
      setMessageType("success");
      setForm(EMPTY);
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save this catalogue item.");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }
  async function toggleActive(item: CatalogItem) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/saas/items", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, is_active: item.is_active === false }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update item status.");
      setMessage(item.is_active === false ? "Catalogue item activated." : "Catalogue item deactivated."); setMessageType("success"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update item status."); setMessageType("error"); }
    finally { setBusy(false); }
  }
  async function importCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMessage(""); setImportOpen(false);
    try {
      const rows = parseCSV(await file.text());
      if (!rows.length) throw new Error("The CSV has no data rows.");
      const required = ["item_code", "name", "item_type", "unit_price", "currency"];
      const missing = required.filter((key) => !(key in rows[0]));
      if (missing.length) throw new Error(`Missing required CSV columns: ${missing.join(", ")}.`);
      let imported = 0; const failures: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const itemType = String(row.item_type || "").trim().toLowerCase();
        const unitPrice = Number(row.unit_price);
        const taxRate = Number(row.tax_rate || 0);
        if (!String(row.name || "").trim()) {
          failures.push(`Row ${i + 2}: name is required.`);
          continue;
        }
        if (!["product", "service"].includes(itemType)) {
          failures.push(`Row ${i + 2}: item_type must be product or service.`);
          continue;
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          failures.push(`Row ${i + 2}: unit_price must be a valid amount of zero or more.`);
          continue;
        }
        if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
          failures.push(`Row ${i + 2}: tax_rate must be between 0 and 100.`);
          continue;
        }
        const response = await fetch("/api/saas/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_code: row.item_code,
            name: String(row.name).trim(),
            item_type: itemType,
            unit_price: unitPrice,
            currency: String(row.currency || "UGX").trim().toUpperCase(),
            category: row.category || "",
            unit: row.unit || "unit",
            tax_rate: taxRate,
            description: row.description || "",
            tax_inclusive: /^(true|yes|1)$/i.test(row.tax_inclusive || ""),
          }),
        });
        const data = await response.json();
        if (response.ok) imported++;
        else failures.push(`Row ${i + 2}: ${data.error || "not imported"}`);
      }
      setMessage(`CSV import finished: ${imported} imported, ${failures.length} not imported.${failures.length ? ` ${failures.slice(0, 4).join(" ")}` : ""}${failures.length > 4 ? ` Plus ${failures.length - 4} more errors.` : ""}`);
      setMessageType(failures.length ? "error" : "success"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this CSV."); setMessageType("error"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <div className="min-h-screen bg-[#F7F8FA] jbcs-products-redesign">
    <FinanceSidebar activeHref="/workspace/finance/items" />

    <main className="finance-app-main md:ml-[264px] jbcs-finance-consistent-main" style={{ flex: 1, minWidth: 0 }}>
      <div className="inner-content" style={{ padding: "24px clamp(14px, 2.6vw, 38px) 48px" }}>
        <div className="jbcs-finance-top"><span>JOHDEN BUSINESS SUITE / FINANCE</span><Link href="/workspace/finance">Back to Finance overview</Link></div>
        <header className="jbcs-finance-heading"><div><p className="jbcs-eyebrow">CATALOGUE MANAGEMENT</p><h1>Products &amp; Services</h1><p>Manage the products and services available for quotes and invoices.</p></div><div className="jbcs-page-actions"><button type="button" className="jbcs-secondary-button" onClick={() => { setImportOpen((v) => !v); setFormOpen(false); }}><Upload size={15} style={{ marginRight: 7 }} />Import CSV</button><button type="button" className="jbcs-primary-button" onClick={startNew}><Plus size={16} style={{ marginRight: 7 }} />Add product or service</button></div></header>

        <section className="jbcs-catalogue-summary jbcs-stat-grid" aria-label="Catalogue summary">
          <article><span>Total catalogue items</span><strong>{items.length.toLocaleString()}</strong><small>Products and services, including inactive items</small></article>
          <article><span>Active products</span><strong>{products.toLocaleString()}</strong><small><Boxes size={13} style={{ display: "inline", marginRight: 4 }} />Available to use on new documents</small></article>
          <article><span>Active services</span><strong>{services.toLocaleString()}</strong><small><Wrench size={13} style={{ display: "inline", marginRight: 4 }} />Available to use on new documents</small></article>
        </section>

        {message && <div role="status" className={`jbcs-message ${messageType === "success" ? "success" : ""}`} style={{ marginBottom: 16 }}>{message}</div>}

        {importOpen && <section className="jbcs-panel" style={{ marginBottom: 16 }}><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">BULK UPLOAD</p><h2>Import products and services</h2></div><button type="button" className="jbcs-secondary-button" onClick={() => setImportOpen(false)}><X size={14} style={{ marginRight: 6 }} />Close</button></div><p style={{ fontSize: 12, color: "#77717a", margin: "0 0 8px" }}>Upload a CSV containing <code>item_code, name, item_type, unit_price, currency</code>. Optional columns: <code>category, unit, tax_rate, description, tax_inclusive</code>. Item types must be <code>product</code> or <code>service</code>; duplicate item codes will be reported.</p><p className="jbcs-help" style={{ margin: "0 0 14px" }}>Import adds catalogue records. It does not modify existing invoices or quotes.</p><input ref={fileRef} type="file" accept=".csv,text/csv" disabled={busy} onChange={importCSV} aria-label="Choose catalogue CSV" /></section>}

        {formOpen && <section className="jbcs-panel" style={{ marginBottom: 16 }}><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">{editingId ? "UPDATE CATALOGUE" : "NEW CATALOGUE ENTRY"}</p><h2>{editingId ? "Edit product or service" : "Add product or service"}</h2></div><button type="button" className="jbcs-secondary-button" onClick={() => { setFormOpen(false); setEditingId(null); setForm(EMPTY); }}><X size={14} style={{ marginRight: 6 }} />Cancel</button></div>
          <form onSubmit={save} className="jbcs-form-grid">
            <label>Item code *<input required maxLength={40} value={form.item_code} onChange={(e) => setForm((v) => ({ ...v, item_code: e.target.value }))} placeholder="e.g. JBCS-001" /></label>
            <label>Name *<input required maxLength={160} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Product or service name" /></label>
            <label>Type *<select required value={form.item_type} onChange={(e) => setForm((v) => ({ ...v, item_type: e.target.value as "product" | "service" }))}><option value="product">Product</option><option value="service">Service</option></select></label>
            <label>Category<input maxLength={100} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))} placeholder="e.g. Consulting" /></label>
            <label>Unit<input maxLength={30} value={form.unit} onChange={(e) => setForm((v) => ({ ...v, unit: e.target.value }))} placeholder="unit, hour, day" /></label>
            <label>Unit price *<input required type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm((v) => ({ ...v, unit_price: e.target.value }))} /></label>
            <label>Currency *<input required maxLength={3} minLength={3} value={form.currency} onChange={(e) => setForm((v) => ({ ...v, currency: e.target.value.toUpperCase() }))} placeholder="UGX" /></label>
            <label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={form.tax_rate} onChange={(e) => setForm((v) => ({ ...v, tax_rate: e.target.value }))} /></label>
            <label className="jbcs-span-2">Description<textarea rows={2} maxLength={1000} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} placeholder="Optional description for internal reference" /></label>
            <label className="jbcs-span-2" style={{ display: "flex", alignItems: "center", gap: 9, flexDirection: "row" }}><input type="checkbox" checked={form.tax_inclusive} onChange={(e) => setForm((v) => ({ ...v, tax_inclusive: e.target.checked }))} style={{ width: 16, minHeight: 16 }} />Price already includes tax</label>
            <div className="jbcs-span-2" style={{ display: "flex", justifyContent: "flex-end", gap: 9, flexWrap: "wrap" }}><button type="button" className="jbcs-secondary-button" onClick={() => { setFormOpen(false); setEditingId(null); setForm(EMPTY); }}>Cancel</button><button type="submit" className="jbcs-primary-button" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Save catalogue item"}</button></div>
          </form>
        </section>}

        <section className="jbcs-catalogue-register overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Products &amp; Services <span className="text-sm font-medium text-slate-400">({visibleItems.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select an item to review its details and actions.</p></div><div className="flex flex-wrap gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search code, name or category…" aria-label="Search products and services" className="min-w-[200px] rounded-lg border border-slate-200 px-3 py-2 text-sm"/><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} aria-label="Filter item type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="all">All types</option><option value="product">Products</option><option value="service">Services</option></select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter item status" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="all">All statuses</option></select></div></div>
          <div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Product &amp; service register</span><span className="text-xs text-slate-400">{visibleItems.length} total</span></div><div className="max-h-[700px] overflow-y-auto">{loading?<p className="p-6 text-sm text-slate-500">Loading catalogue…</p>:visibleItems.length===0?<p className="p-6 text-sm text-slate-500">No matching items.</p>:visibleItems.map(item=><button key={item.id} type="button" onClick={()=>setSelectedItemId(item.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left ${(selectedItem?.id===item.id)?"bg-rose-50/80 ring-1 ring-inset ring-rose-100":"hover:bg-slate-50"}`}><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{item.name||"Unnamed item"}</span><span className="whitespace-nowrap text-sm font-semibold">{money(item.currency||"UGX",item.unit_price)}</span></span><span className="mt-1 block text-xs text-blue-600">{item.item_code||"No item code"}</span><span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"><span>{item.item_type||"Item"} · {item.category||"Uncategorised"}</span><span>{item.is_active===false?"Inactive":"Active"}</span></span></button>)}</div></aside>
            <div className="min-w-0 bg-slate-50/70">{!selectedItem?<div className="flex min-h-[450px] items-center justify-center p-8 text-center text-sm text-slate-500">Select a product or service to view its details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected product / service</p><h3 className="mt-0.5 text-xl font-bold">{selectedItem.name||"Unnamed item"}</h3><p className="mt-1 text-xs text-slate-500">{selectedItem.item_code||"No item code"}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>startEdit(selectedItem)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><Pencil size={14} className="mr-1 inline"/>Edit</button><button type="button" disabled={busy} onClick={()=>void toggleActive(selectedItem)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><Power size={14} className="mr-1 inline"/>{selectedItem.is_active===false?"Activate":"Deactivate"}</button><button type="button" onClick={()=>{setFormOpen(true);setEditingId(selectedItem.id);setForm({name:selectedItem.name||"",item_code:selectedItem.item_code||"",item_type:selectedItem.item_type||"service",category:selectedItem.category||"",unit:selectedItem.unit||"unit",unit_price:String(selectedItem.unit_price??""),currency:selectedItem.currency||"UGX",tax_rate:String(selectedItem.tax_rate??0),tax_inclusive:Boolean(selectedItem.tax_inclusive),description:selectedItem.description||""} as ItemForm)}} className="rounded-lg bg-[#F3192D] px-3 py-2 text-sm font-semibold text-white">Edit details</button></div></div><div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit price</p><p className="mt-2 text-2xl font-bold">{money(selectedItem.currency||"UGX",selectedItem.unit_price)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><p className="mt-2 font-semibold">{selectedItem.is_active===false?"Inactive":"Active"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type / category</p><p className="mt-2 font-semibold capitalize">{selectedItem.item_type||"—"} · {selectedItem.category||"Uncategorised"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit / tax</p><p className="mt-2 font-semibold">{selectedItem.unit||"unit"} · {Number(selectedItem.tax_rate||0)}% tax</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedItem.description||"No description recorded."}</p></div></div></div></>}</div>
          </div>
        </section>
        <p className="jbcs-help" style={{ marginTop: 12 }}>Catalogue records are retained when deactivated. Existing invoices and quotes are not rewritten when catalogue details change.</p>
      </div>
    </main>
  </div>;
}
