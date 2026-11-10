"use client";
import Link from "next/link";
import { Home, Users, FileText, FileCheck, Receipt, ArrowLeftRight, TrendingUp, Truck, Wallet, BarChart3, Package, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type CSSProperties } from "react";

type Item = {
  id: string;
  name?: string;
  currency?: string;
  quote_number?: string;
  receipt_number?: string;
  credit_note_number?: string;
  project_name?: string;
  amount?: number;
  total?: number;
  status?: string;
  frequency?: string;
  next_run_date?: string;
  description?: string;
};

const financeNav = [
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

const modules: Record<string, {
  title: string;
  endpoint: string;
  collection: string;
  fields: { name: string; label: string; type?: string; required?: boolean; initial?: string }[];
}> = {
  quotes: { title: "Quotes", endpoint: "/api/saas/quotes", collection: "quotes", fields: [{ name: "contact_id", label: "Customer ID", required: true }, { name: "currency", label: "Currency", initial: "UGX" }, { name: "description", label: "Quote description", required: true }, { name: "quantity", label: "Quantity", type: "number", initial: "1" }, { name: "unit_price", label: "Unit price", type: "number", initial: "0" }, { name: "tax_rate", label: "Tax rate (%)", type: "number", initial: "0" }, { name: "valid_until", label: "Valid until", type: "date" }] },
  receipts: { title: "Sales Receipts", endpoint: "/api/saas/receipts", collection: "receipts", fields: [{ name: "contact_id", label: "Customer ID" }, { name: "amount", label: "Amount", type: "number", required: true }, { name: "currency", label: "Currency", initial: "UGX" }, { name: "payment_method", label: "Payment method", type: "select:cash,bank_transfer,mobile_money,card,cheque,other", required: true }, { name: "reference", label: "Reference" }] },
  recurring: { title: "Recurring Invoices & Expenses", endpoint: "/api/saas/recurring", collection: "templates", fields: [{ name: "name", label: "Template name", required: true }, { name: "template_type", label: "Type", type: "select:invoice,expense", initial: "invoice" }, { name: "amount", label: "Amount", type: "number", initial: "0" }, { name: "currency", label: "Currency", initial: "UGX" }, { name: "frequency", label: "Frequency", type: "select:weekly,monthly,quarterly,yearly", initial: "monthly" }, { name: "next_run_date", label: "Next run date", type: "date", required: true }, { name: "description", label: "Description" }] },
  "credit-notes": { title: "Credit Notes", endpoint: "/api/saas/credit-notes", collection: "credit_notes", fields: [{ name: "invoice_id", label: "Invoice ID", required: true }, { name: "amount", label: "Credit amount", type: "number", required: true }, { name: "reason", label: "Reason", required: true }] },
  "time-tracking": { title: "Time Tracking", endpoint: "/api/saas/time-entries", collection: "entries", fields: [{ name: "project_name", label: "Project / client", required: true }, { name: "hours", label: "Hours", type: "number", required: true }, { name: "hourly_rate", label: "Hourly rate", type: "number", initial: "0" }, { name: "currency", label: "Currency", initial: "UGX" }, { name: "work_date", label: "Work date", type: "date" }, { name: "description", label: "Work description" }] },
};

const navLinkStyle = (active: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 11, padding: "10px 12px",
  borderRadius: 8, textDecoration: "none", color: active ? "#fff" : "#d5d0d4",
  background: active ? "#9f1d35" : "transparent", fontSize: 13, fontWeight: active ? 700 : 500,
  marginBottom: 3, whiteSpace: "nowrap",
});

export default function FinanceModule({ module }: { module: string }) {
  const cfg = modules[module];
  const [rows, setRows] = useState<Item[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    if (!cfg) return;
    const r = await fetch(cfg.endpoint, { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Could not load records.");
    setRows(Array.isArray(d[cfg.collection]) ? d[cfg.collection] : []);
  }

  useEffect(() => { load().catch((e) => setMessage(e.message)); }, [module]);

  if (!cfg) return <main style={{ padding: 32 }}><Link href="/workspace/finance">â† Finance overview</Link><h1>Module unavailable</h1></main>;

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const body: Record<string, unknown> = { ...values };

      if (module === "quotes") {
        body.items = [
          {
            description: values.description,
            quantity: Number(values.quantity),
            unit_price: Number(values.unit_price),
            tax_rate: Number(values.tax_rate || 0),
          },
        ];
      }
      const r = await fetch(cfg.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save.");
      setMessage("Saved successfully."); setValues({}); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  }

  const visibleRows = rows.filter((r) => `${r.name || ""} ${r.quote_number || ""} ${r.receipt_number || ""} ${r.credit_note_number || ""} ${r.project_name || ""} ${r.status || ""} ${r.frequency || ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f6f8", color: "#29252a", fontFamily: "Arial, sans-serif" }}>
      <aside style={{ width: 248, flex: "0 0 248px", background: "#292629", color: "#fff", padding: "18px 14px", boxSizing: "border-box", height: "100vh", overflowY: "auto", position: "sticky", top: 0, display: "flex", flexDirection: "column" }}>
        <Link href="/workspace/finance" style={{ display: "flex", background: "#fff", borderRadius: 9, minHeight: 76, alignItems: "center", justifyContent: "center", padding: 10, marginBottom: 20 }}>
          <img src="/johden-logo.svg" alt="Johden Business Consultancy Services" style={{ display: "block", maxWidth: "100%", width: 190, maxHeight: 58, objectFit: "contain" }} />
        </Link>
        <div style={{ fontSize: 10, letterSpacing: ".14em", color: "#aaa2a8", fontWeight: 800, padding: "0 12px 10px" }}>FINANCE WORKSPACE</div>
        <nav aria-label="Finance navigation" style={{ flex: 1 }}>
          {financeNav.map((item) => {
            const active = item.href === (module === "receipts" ? "/workspace/finance/sales-receipts" : `/workspace/finance/${module}`);
            const Icon = item.icon;
            const group = item.label === "Dashboard" ? "WORKSPACE" : item.label === "Products & Services" ? "SALES" : item.label === "Expenses" ? "FINANCE" : null;
            return <div key={item.href}>{group && <div style={{ padding: "15px 12px 7px", color: "#aaa2a8", fontSize: 10, letterSpacing: ".14em", fontWeight: 800 }}>{group}</div>}<Link href={item.href} title={item.label} style={navLinkStyle(active)}><span style={{ width: 18, minWidth: 18, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon size={16} strokeWidth={1.9} /></span><span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span></Link></div>;
          })}
        </nav>
        <div style={{ marginTop: 14, borderTop: "1px solid #484348", padding: "14px 4px 0" }}><Link href="/workspace/settings" style={navLinkStyle(module === "settings")}><SettingsIcon size={16} />Settings</Link><form action="/api/saas/logout" method="post" style={{ marginTop: 8 }}><button type="submit" style={{ ...navLinkStyle(false), width: "100%", border: "1px solid #4a4549", cursor: "pointer", textAlign: "left" }}><span aria-hidden="true">↪</span>Log out</button></form></div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "30px clamp(16px, 3vw, 40px) 56px" }}>
        <div style={{ maxWidth: 1250, margin: "0 auto" }}>
          <div style={{ fontSize: 11, color: "#8b8188", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Johden Business Suite / Finance</div>
          <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, margin: "8px 0 24px" }}>
            <div><h1 style={{ margin: 0, fontSize: "clamp(26px, 3vw, 36px)", letterSpacing: "-.04em" }}>{cfg.title}</h1><p style={{ margin: "8px 0 0", color: "#756d75", fontSize: 13 }}>Workspace-scoped business records Â· Base currency UGX</p></div>
          </header>


          <section style={{ background: "#fff", border: "1px solid #e4e5e9", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}><h2 style={{ fontSize: 18, margin: 0 }}>Create new record</h2></div>
            <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
              {cfg.fields.map((f) => <label key={f.name} style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#464149" }}>{f.label}{f.type?.startsWith("select:") ? <select required={f.required} value={values[f.name] ?? f.initial ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))} style={{ width: "100%", minHeight: 42, padding: "10px 12px", border: "1px solid #dfe2e7", borderRadius: 7, background: "#fff" }}><option value="">Selectâ€¦</option>{f.type.slice(7).split(",").map((v) => <option key={v} value={v}>{v.replaceAll("_", " ")}</option>)}</select> : <input required={f.required} type={f.type || "text"} value={values[f.name] ?? f.initial ?? ""} onChange={(e) => setValues((s) => ({ ...s, [f.name]: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", minHeight: 42, padding: "10px 12px", border: "1px solid #dfe2e7", borderRadius: 7 }} />}</label>)}
              <div style={{ display: "flex", alignItems: "flex-end" }}><button disabled={busy} style={{ width: "100%", minHeight: 42, border: 0, borderRadius: 7, background: "#9f1d35", color: "#fff", padding: "11px 16px", fontWeight: 800, cursor: "pointer" }}>{busy ? "Savingâ€¦" : "Save record"}</button></div>
            </form>
          </section>

          {message && <p role="status" style={{ margin: "0 0 18px", padding: 12, borderRadius: 7, border: "1px solid #e4e5e9", background: message.includes("not imported") || /error|missing|required|invalid|could not/i.test(message) ? "#fff0f1" : "#f0f8f2", color: message.includes("not imported") || /error|missing|required|invalid|could not/i.test(message) ? "#a81122" : "#176c3b", fontSize: 12, lineHeight: 1.6 }}>{message}</p>}

          <section style={{ background: "#fff", border: "1px solid #e4e5e9", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div><h2 style={{ fontSize: 20, margin: "0 0 5px" }}>Saved records ({rows.length})</h2><p style={{ margin: 0, color: "#746d75", fontSize: 12 }}>Search and review records saved in this workspace.</p></div>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recordsâ€¦" style={{ width: "min(100%, 300px)", minHeight: 40, padding: "9px 12px", border: "1px solid #dfe2e7", borderRadius: 7, boxSizing: "border-box" }} />
            </div>
            {visibleRows.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620, textAlign: "left" }}>
                  <thead>
                    <tr>
                      {["Record", "Amount", "Details"].map((h) => (
                        <th key={h} style={{ padding: "12px 10px", borderBottom: "1px solid #e8e7eb", background: "#faf9fb", color: "#756d75", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r, i) => (
                      <tr key={r.id || i}>
                        <td style={{ padding: 11, borderBottom: "1px solid #f0eef1", fontSize: 12, fontWeight: 700 }}>{r.name || r.quote_number || r.receipt_number || r.credit_note_number || r.project_name || "Record"}</td>
                        <td style={{ padding: 11, borderBottom: "1px solid #f0eef1", fontSize: 12 }}>{r.currency || ""} {r.amount ?? r.total ?? ""}</td>
                        <td style={{ padding: 11, borderBottom: "1px solid #f0eef1", fontSize: 12 }}>{r.status || r.frequency || r.next_run_date || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p style={{ color: "#746d75", fontSize: 13 }}>{search ? "No records match your search." : "No records saved yet."}</p>}
          </section>
        </div>
      </main>
    </div>
  );
}
