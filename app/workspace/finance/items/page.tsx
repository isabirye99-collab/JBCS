"use client";

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

  function startNew() { setEditingId(null); setForm(EMPTY); setFormOpen(true); setImportOpen(false); setMessage(""); }
  function startEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({ item_code: item.item_code || "", name: item.name || "", item_type: item.item_type || "service", category: item.category || "", unit: item.unit || "unit", unit_price: String(item.unit_price ?? 0), currency: item.currency || "UGX", tax_rate: String(item.tax_rate ?? 0), description: item.description || "", tax_inclusive: Boolean(item.tax_inclusive) });
    setFormOpen(true); setImportOpen(false); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const payload = { ...form, unit_price: Number(form.unit_price), tax_rate: Number(form.tax_rate), id: editingId || undefined };
      const response = await fetch("/api/saas/items", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not save this catalogue item.");
      setMessage(editingId ? "Catalogue item updated." : "Catalogue item created."); setMessageType("success"); setForm(EMPTY); setEditingId(null); setFormOpen(false); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this catalogue item."); setMessageType("error"); }
    finally { setBusy(false); }
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
        const response = await fetch("/api/saas/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ item_code: row.item_code, name: row.name, item_type: row.item_type.toLowerCase(), unit_price: Number(row.unit_price), currency: row.currency || "UGX", category: row.category || "", unit: row.unit || "unit", tax_rate: Number(row.tax_rate || 0), description: row.description || "", tax_inclusive: /^(true|yes|1)$/i.test(row.tax_inclusive || "") }) });
        const data = await response.json(); if (response.ok) imported++; else failures.push(`Row ${i + 2}: ${data.error || "not imported"}`);
      }
      setMessage(`CSV import finished: ${imported} imported, ${failures.length} not imported.${failures.length ? ` ${failures.slice(0, 4).join(" ")}` : ""}${failures.length > 4 ? ` Plus ${failures.length - 4} more errors.` : ""}`);
      setMessageType(failures.length ? "error" : "success"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not read this CSV."); setMessageType("error"); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  return <div className="finance-shell">
    <aside className="finance-side-rail">
      <Link href="/workspace/finance" className="finance-side-brand" style={{ display: "flex", background: "#fff", borderRadius: 9, minHeight: 72, alignItems: "center", justifyContent: "center", padding: 10, marginBottom: 20 }}><img src="/johden-logo.svg" alt="Johden Business Consultancy Services" style={{ display: "block", maxWidth: "100%", width: 190, maxHeight: 58, objectFit: "contain" }} /></Link>
      <div className="finance-side-label">FINANCE WORKSPACE</div>
      <nav className="finance-side-nav" aria-label="Finance navigation">{NAV.map((item) => { const Icon = item.icon; const active = item.href === "/workspace/finance/items"; return <Link key={item.href} href={item.href} className={active ? "selected" : ""} aria-current={active ? "page" : undefined}><Icon size={16} strokeWidth={1.9} /><span>{item.label}</span></Link>; })}</nav>
      <div className="finance-side-bottom" style={{ marginTop: "auto", borderTop: "1px solid #484348", padding: "16px 10px 0", color: "#bcb5bb", fontSize: 11, lineHeight: 1.6 }}>Johden Business Suite<br />Finance &amp; Billing</div>
    </aside>

    <main className="finance-app-main jbcs-finance-consistent-main" style={{ flex: 1, minWidth: 0 }}>
      <div className="inner-content" style={{ padding: "24px clamp(14px, 2.6vw, 38px) 48px" }}>
        <div className="jbcs-finance-top"><span>JOHDEN BUSINESS SUITE / FINANCE</span><Link href="/workspace/finance">Back to Finance overview</Link></div>
        <header className="jbcs-finance-heading"><div><p className="jbcs-eyebrow">CATALOGUE MANAGEMENT</p><h1>Products &amp; Services</h1><p>Manage the products and services available for quotes and invoices.</p></div><div className="jbcs-page-actions"><button type="button" className="jbcs-secondary-button" onClick={() => { setImportOpen((v) => !v); setFormOpen(false); }}><Upload size={15} style={{ marginRight: 7 }} />Import CSV</button><button type="button" className="jbcs-primary-button" onClick={startNew}><Plus size={16} style={{ marginRight: 7 }} />Add product or service</button></div></header>

        <section className="jbcs-stat-grid" aria-label="Catalogue summary">
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

        <section className="jbcs-panel jbcs-register-panel"><div className="jbcs-panel-heading"><div><p className="jbcs-eyebrow">CATALOGUE REGISTER</p><h2>Products and services <span style={{ color: "#77717a", fontWeight: 500, fontSize: 13 }}>({visibleItems.length})</span></h2><p style={{ margin: "5px 0 0", color: "#77717a", fontSize: 12 }}>Search, edit, or deactivate catalogue items without deleting their records.</p></div><button type="button" className="jbcs-secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw size={14} style={{ marginRight: 7 }} />Refresh</button></div>
          <div className="jbcs-filters" style={{ gridTemplateColumns: "minmax(220px,1fr) minmax(120px,150px) minmax(120px,150px)", marginBottom: 16 }}><div style={{ position: "relative" }}><Search size={15} style={{ position: "absolute", left: 11, top: 12, color: "#77717a" }} /><input className="jbcs-search" style={{ maxWidth: "none", paddingLeft: 34 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, category…" aria-label="Search catalogue" /></div><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type"><option value="all">All types</option><option value="product">Products</option><option value="service">Services</option></select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="active">Active only</option><option value="inactive">Inactive only</option><option value="all">All statuses</option></select></div>
          <div className="jbcs-table-wrap"><table className="jbcs-table" style={{ minWidth: 850 }}><thead><tr>{["Item code", "Name", "Type / category", "Unit price", "Tax", "Status", "Actions"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>
            {loading ? <tr><td className="jbcs-empty" colSpan={7}>Loading catalogue…</td></tr> : visibleItems.length === 0 ? <tr><td className="jbcs-empty" colSpan={7}>{search || typeFilter !== "all" || statusFilter !== "active" ? "No catalogue items match these filters." : "No catalogue items yet. Select Add product or service to create the first item."}</td></tr> : visibleItems.map((item) => <tr key={item.id}>
              <td><strong>{item.item_code || "—"}</strong></td><td><strong>{item.name || "Unnamed item"}</strong>{item.description && <small>{item.description}</small>}</td><td><strong style={{ textTransform: "capitalize" }}>{item.item_type || "—"}</strong><small>{item.category || "Uncategorised"} · per {item.unit || "unit"}</small></td><td><span className="jbcs-amount">{money(item.currency || "UGX", item.unit_price)}</span></td><td>{Number(item.tax_rate || 0)}%</td><td><span style={{ display: "inline-flex", borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800, background: item.is_active === false ? "#f2f3f5" : "#edf8f0", color: item.is_active === false ? "#69636b" : "#176c3b" }}>{item.is_active === false ? "Inactive" : "Active"}</span></td><td style={{ whiteSpace: "nowrap" }}><button type="button" className="jbcs-secondary-button" style={{ padding: "7px 9px", marginRight: 6 }} onClick={() => startEdit(item)} aria-label={`Edit ${item.name || item.item_code}`}><Pencil size={13} style={{ marginRight: 5 }} />Edit</button><button type="button" className="jbcs-secondary-button" style={{ padding: "7px 9px" }} disabled={busy} onClick={() => void toggleActive(item)} aria-label={`${item.is_active === false ? "Activate" : "Deactivate"} ${item.name || item.item_code}`}><Power size={13} style={{ marginRight: 5 }} />{item.is_active === false ? "Activate" : "Deactivate"}</button></td>
            </tr>)}
          </tbody></table></div>
        </section>
        <p className="jbcs-help" style={{ marginTop: 12 }}>Catalogue records are retained when deactivated. Existing invoices and quotes are not rewritten when catalogue details change.</p>
      </div>
    </main>
  </div>;
}
