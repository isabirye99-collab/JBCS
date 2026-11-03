"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Customer = { id: string; name: string; email: string | null; phone: string | null; address: string | null; tax_number: string | null; notes: string | null; created_at: string };
const emptyForm = { name: "", email: "", phone: "", address: "", tax_number: "", notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance/customers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load customers.");
      setCustomers(data.customers || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load customers."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadCustomers(); }, [loadCustomers]);

  const filtered = useMemo(() => customers.filter(c => [c.name, c.email, c.phone, c.tax_number].some(v => v?.toLowerCase().includes(search.toLowerCase()))), [customers, search]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/finance/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save customer.");
      setCustomers(prev => [data.customer, ...prev]);
      setForm(emptyForm); setShowForm(false); setNotice("Customer saved successfully.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save customer."); }
    finally { setSaving(false); }
  }

  const field: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1px solid #e3e5e8", borderRadius: 8, background: "#fff", color: "#222", font: "inherit", boxSizing: "border-box" };
  const label: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, color: "#51545b", fontWeight: 600 };

  return <main style={{ minHeight: "100vh", background: "#f7f7f8", color: "#202127", padding: "28px clamp(16px,4vw,56px)", fontFamily: "Arial, sans-serif" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
      <div><a href="/finance" style={{ color: "#9d2632", textDecoration: "none", fontSize: 13 }}>← Finance dashboard</a><p style={{ color: "#a52b37", letterSpacing: 1.6, fontSize: 11, fontWeight: 700, margin: "18px 0 7px" }}>JOHDEN FINANCE · CUSTOMERS</p><h1 style={{ fontSize: "clamp(26px,3vw,34px)", margin: 0 }}>Customers</h1><p style={{ color: "#737681", marginTop: 8 }}>Keep customer and organisation details organised for quotes and invoices.</p></div>
      <button onClick={() => { setShowForm(v => !v); setError(""); }} style={{ background: "#a92b38", color: "white", border: 0, borderRadius: 9, padding: "12px 17px", fontWeight: 700, cursor: "pointer" }}>{showForm ? "Close form" : "+ Add customer"}</button>
    </header>

    {notice && <p role="status" style={{ background: "#e8f5ed", color: "#21663d", padding: 12, borderRadius: 8 }}>{notice}</p>}
    {error && <p role="alert" style={{ background: "#fff0f0", color: "#9b1c28", padding: 12, borderRadius: 8 }}>{error}</p>}

    {showForm && <form onSubmit={submit} style={{ background: "#fff", border: "1px solid #e8e8eb", borderRadius: 14, padding: 22, marginBottom: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 15 }}>
      <label style={label}>Customer / organisation name *<input required maxLength={160} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={field} placeholder="e.g. Acme Limited" /></label>
      <label style={label}>Email address<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={field} placeholder="accounts@example.com" /></label>
      <label style={label}>Telephone number<input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={field} placeholder="+256..." /></label>
      <label style={label}>Tax / TIN number<input value={form.tax_number} onChange={e => setForm({ ...form, tax_number: e.target.value })} style={field} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>Address<input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={field} /></label>
      <label style={{ ...label, gridColumn: "1 / -1" }}>Notes<textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={field} /></label>
      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}><button disabled={saving} type="submit" style={{ background: "#a92b38", color: "#fff", border: 0, borderRadius: 8, padding: "12px 20px", fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving..." : "Save customer"}</button></div>
    </form>}

    <section style={{ background: "#fff", border: "1px solid #e8e8eb", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 18, flexWrap: "wrap", borderBottom: "1px solid #eee" }}><div><h2 style={{ margin: 0, fontSize: 17 }}>Customer directory</h2><p style={{ color: "#777984", fontSize: 13, margin: "6px 0 0" }}>{customers.length} customer{customers.length === 1 ? "" : "s"} registered</p></div><input aria-label="Search customers" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or phone..." style={{ ...field, maxWidth: 320 }} /></div>
      {loading ? <p style={{ padding: 24, color: "#777" }}>Loading customers…</p> : filtered.length === 0 ? <div style={{ padding: "42px 20px", textAlign: "center" }}><h3 style={{ marginBottom: 8 }}>{search ? "No matching customers" : "No customers yet"}</h3><p style={{ color: "#777984", margin: 0 }}>{search ? "Try another search term." : "Add your first customer to begin preparing quotes and invoices."}</p></div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 650 }}><thead><tr style={{ background: "#fafafb", textAlign: "left", fontSize: 12, color: "#666" }}>{["Customer","Email","Telephone","TIN","Added"].map(h => <th key={h} style={{ padding: "13px 16px", borderBottom: "1px solid #eee" }}>{h}</th>)}</tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td style={{ padding: 16, borderBottom: "1px solid #f0f0f2", fontWeight: 700 }}>{c.name}</td><td style={{ padding: 16, borderBottom: "1px solid #f0f0f2" }}>{c.email || "—"}</td><td style={{ padding: 16, borderBottom: "1px solid #f0f0f2" }}>{c.phone || "—"}</td><td style={{ padding: 16, borderBottom: "1px solid #f0f0f2" }}>{c.tax_number || "—"}</td><td style={{ padding: 16, borderBottom: "1px solid #f0f0f2", whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleDateString("en-UG")}</td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
