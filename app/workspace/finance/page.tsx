"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = { id: string; name: string; email?: string | null };
type Invoice = { id: string; invoice_number: string; issue_date: string; due_date?: string | null; currency: string; total: number; amount_paid: number; status: string; business_contacts?: { name?: string } | null };

export default function WorkspaceFinancePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [description, setDescription] = useState("Professional services");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("UGX");
  const [dueDate, setDueDate] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([fetch("/api/saas/customers", { cache: "no-store" }), fetch("/api/saas/invoices", { cache: "no-store" })]);
    const cd = await c.json(); const id = await i.json();
    if (!c.ok) throw new Error(cd.error || "Could not load customers.");
    if (!i.ok) throw new Error(id.error || "Could not load invoices.");
    setCustomers(cd.customers || []); setInvoices(id.invoices || []);
    if (!selectedCustomer && cd.customers?.length) setSelectedCustomer(cd.customers[0].id);
  }, [selectedCustomer]);

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : "Unable to load workspace data.")); }, [load]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customerName, email: customerEmail }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create customer.");
      setCustomerName(""); setCustomerEmail(""); setSelectedCustomer(data.customer.id);
      setNotice("Customer saved to this workspace."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save customer."); }
    finally { setBusy(false); }
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: selectedCustomer, currency, due_date: dueDate, items: [{ description, quantity: Number(quantity), unit_price: Number(unitPrice), tax_rate: Number(taxRate) }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create invoice.");
      setNotice("Draft invoice created successfully."); setDueDate(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create invoice."); }
    finally { setBusy(false); }
  }

  const money = (value: number, code: string) => new Intl.NumberFormat("en-UG", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value || 0));

  return <main className="inner-page invoice-product-page">
    <header className="site-header"><Link className="brand" href="/workspace">Johden Business Tools</Link><nav className="desktop-nav"><Link href="/workspace">Workspace</Link><Link href="/invoicing">Product site</Link></nav><form action="/api/saas/logout" method="post"><button className="button button-secondary">Sign out</button></form></header>
    <section className="inner-hero invoice-product-hero"><span className="eyebrow dark"><i /> PRIVATE FINANCE WORKSPACE</span><h1>Customers and <em>invoices.</em></h1><p>Create customer records and draft invoices within your company workspace. Draft creation does not send invoices or record payments.</p></section>
    <section className="inner-content">
      {error && <p role="alert" className="admin-error">{error}</p>}{notice && <p role="status" className="admin-success">{notice}</p>}
      <div className="invoice-feature-grid">
        <article className="invoice-feature-card"><h3>Add a customer</h3><form className="admin-client-form" onSubmit={createCustomer}><label>Customer or company name<input required minLength={2} maxLength={160} value={customerName} onChange={e=>setCustomerName(e.target.value)} /></label><label>Email (optional)<input type="email" maxLength={254} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} /></label><button type="submit" disabled={busy}>Save customer</button></form></article>
        <article className="invoice-feature-card"><h3>Create a draft invoice</h3>{customers.length===0 && <p>Add a customer first to create an invoice.</p>}<form className="admin-client-form" onSubmit={createInvoice}><label>Customer<select required value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}><option value="">Choose customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Description<input required maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} /></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Quantity<input required type="number" min="0.001" step="0.001" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><label>Unit price<input required type="number" min="0" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e=>setTaxRate(e.target.value)} /></label><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>UGX</option><option>USD</option><option>EUR</option><option>GBP</option><option>KES</option><option>TZS</option></select></label></div><label>Due date (optional)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label><button type="submit" disabled={busy || !customers.length || !selectedCustomer}>Create draft invoice</button></form></article>
      </div>
      <div style={{marginTop:32}}><h2>Recent invoices</h2>{invoices.length===0 ? <p>No invoices yet. Create your first draft above.</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12}}>Invoice</th><th style={{padding:12}}>Date</th><th style={{padding:12}}>Customer</th><th style={{padding:12}}>Total</th><th style={{padding:12}}>Status</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td style={{padding:12}}>{i.invoice_number}</td><td style={{padding:12}}>{i.issue_date}</td><td style={{padding:12}}>{i.business_contacts?.name || "Customer"}</td><td style={{padding:12}}>{money(i.total,i.currency)}</td><td style={{padding:12}}>{i.status}</td></tr>)}</tbody></table></div>}</div>
      <p style={{marginTop:20,fontSize:13,opacity:.8}}>This is an initial workspace module. Invoice sending, PDFs, payment recording and subscription checkout remain disabled until their workflows are implemented and tested.</p>
    </section>
  </main>;
}
