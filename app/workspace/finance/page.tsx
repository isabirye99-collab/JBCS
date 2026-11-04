"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = { id: string; name: string; email?: string | null; phone?: string | null; address?: string | null; tax_number?: string | null };
type Invoice = { id: string; invoice_number: string; issue_date: string; due_date?: string | null; notes?: string | null; currency: string; total: number; amount_paid: number; status: string; business_contacts?: { name?: string } | null };
type Expense = { id: string; expense_date: string; category: string; description: string; amount: number; currency: string; payment_method: string };

export default function WorkspaceFinancePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategory, setExpenseCategory] = useState("General");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("0");
  const [expenseCurrency, setExpenseCurrency] = useState("UGX");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseMethod, setExpenseMethod] = useState("other");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerTaxNumber, setCustomerTaxNumber] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [description, setDescription] = useState("Professional services");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState("UGX");
  const [dueDate, setDueDate] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<"edit" | "payment" | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");

  const load = useCallback(async () => {
    // Load each workspace resource independently: a customer or expense
    // endpoint failure must never hide invoices that loaded successfully.
    const results = await Promise.allSettled([
      fetch("/api/saas/customers", { cache: "no-store" }).then(async response => ({ response, data: await response.json() })),
      fetch("/api/saas/invoices", { cache: "no-store" }).then(async response => ({ response, data: await response.json() })),
      fetch("/api/saas/expenses", { cache: "no-store" }).then(async response => ({ response, data: await response.json() })),
    ]);
    const errors: string[] = [];
    const customerResult = results[0];
    const invoiceResult = results[1];
    const expenseResult = results[2];

    if (customerResult.status === "fulfilled" && customerResult.value.response.ok) {
      const list = Array.isArray(customerResult.value.data.customers) ? customerResult.value.data.customers : [];
      setCustomers(list);
      if (!selectedCustomer && list.length) setSelectedCustomer(list[0].id);
    } else {
      errors.push(customerResult.status === "fulfilled" ? customerResult.value.data.error || "Could not load customers." : "Could not connect to customers.");
    }

    if (invoiceResult.status === "fulfilled" && invoiceResult.value.response.ok) {
      setInvoices(Array.isArray(invoiceResult.value.data.invoices) ? invoiceResult.value.data.invoices : []);
    } else {
      errors.push(invoiceResult.status === "fulfilled" ? invoiceResult.value.data.error || "Could not load invoices." : "Could not connect to invoices.");
    }

    if (expenseResult.status === "fulfilled" && expenseResult.value.response.ok) {
      setExpenses(Array.isArray(expenseResult.value.data.expenses) ? expenseResult.value.data.expenses : []);
    } else {
      errors.push(expenseResult.status === "fulfilled" ? expenseResult.value.data.error || "Could not load expenses." : "Could not connect to expenses.");
    }

    setError(errors.length ? Array.from(new Set(errors))[0] : "");
  }, [selectedCustomer]);

  useEffect(() => { load().catch(e => setError(e instanceof Error ? e.message : "Unable to load workspace data.")); }, [load]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: customerName, email: customerEmail, phone: customerPhone, address: customerAddress, tax_number: customerTaxNumber }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create customer.");
      setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerAddress(""); setCustomerTaxNumber(""); setSelectedCustomer(data.customer.id);
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

  function editDraftInvoice(invoice: Invoice) {
    setActiveInvoice(invoice); setEditDueDate(invoice.due_date || ""); setEditNotes(invoice.notes || "");
    setDialog("edit"); setError(""); setNotice("");
  }

  async function saveDraftInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeInvoice) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeInvoice.id, due_date: editDueDate, notes: editNotes }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not update invoice.");
      setNotice("Draft invoice details updated."); setDialog(null); setActiveInvoice(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update invoice."); }
    finally { setBusy(false); }
  }

  async function issueInvoice(invoice: Invoice) {
    if (!window.confirm(`Issue invoice ${invoice.invoice_number}? This will make it available for payment recording.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices/issue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not issue invoice.");
      setNotice(`Invoice ${invoice.invoice_number} issued. It has not been emailed to the customer.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to issue invoice."); }
    finally { setBusy(false); }
  }

  function recordPayment(invoice: Invoice) {
    const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
    if (balance <= 0) { setError("This invoice has no outstanding balance."); return; }
    setActiveInvoice(invoice); setPaymentAmount(balance.toFixed(2)); setPaymentMethod("bank_transfer");
    setPaymentDate(new Date().toISOString().slice(0, 10)); setPaymentReference("");
    setDialog("payment"); setError(""); setNotice("");
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeInvoice) return;
    const amount = Number(paymentAmount);
    const balance = Math.max(0, Number(activeInvoice.total || 0) - Number(activeInvoice.amount_paid || 0));
    if (!Number.isFinite(amount) || amount <= 0 || amount > balance) { setError("Enter an amount greater than zero and no more than the outstanding balance."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoice_id: activeInvoice.id, amount, method: paymentMethod, payment_date: paymentDate, payment_reference: paymentReference }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not record payment.");
      setNotice(`Payment recorded for ${activeInvoice.invoice_number}. New status: ${String(data.payment.status).replace("_", " ")}.`);
      setDialog(null); setActiveInvoice(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to record payment."); }
    finally { setBusy(false); }
  }

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: expenseCategory, description: expenseDescription, amount: Number(expenseAmount), currency: expenseCurrency, expense_date: expenseDate, payment_method: expenseMethod, notes: expenseNotes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save expense.");
      setExpenseDescription(""); setExpenseAmount("0"); setExpenseNotes(""); setNotice("Expense recorded in this workspace."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save expense."); }
    finally { setBusy(false); }
  }

  const money = (value: number, code: string) => new Intl.NumberFormat("en-UG", { style: "currency", currency: code, maximumFractionDigits: 2 }).format(Number(value || 0));
  const draftCount = invoices.filter(invoice => invoice.status === "draft").length;
  // Never add amounts in different currencies together: show a separate subtotal per currency.
  const invoiceTotalsByCurrency = invoices.reduce<Record<string, number>>((totals, invoice) => {
    const code = invoice.currency || "UGX";
    totals[code] = (totals[code] || 0) + Number(invoice.total || 0);
    return totals;
  }, {});
  const expenseTotalsByCurrency = expenses.reduce<Record<string, number>>((totals, expense) => {
    const code = expense.currency || "UGX";
    totals[code] = (totals[code] || 0) + Number(expense.amount || 0);
    return totals;
  }, {});
  const formatTotals = (totals: Record<string, number>) =>
    Object.entries(totals).sort(([a], [b]) => a.localeCompare(b)).map(([code, amount]) => money(amount, code)).join(" · ") || money(0, "UGX");
  const filteredCustomers = customers.filter(customer => (customer.name + " " + (customer.email || "")).toLowerCase().includes((customerSearch || globalSearch).toLowerCase()));
  const filteredInvoices = invoices.filter(invoice => [invoice.invoice_number, invoice.business_contacts?.name || "", invoice.status, invoice.issue_date].join(" ").toLowerCase().includes((invoiceSearch || globalSearch).toLowerCase()));
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });
  const eligibleReceivables = invoices.filter(invoice => !["draft", "void", "cancelled", "paid"].includes(String(invoice.status).toLowerCase()));
  const outstandingByAge = eligibleReceivables.reduce((buckets, invoice) => {
    const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
    if (!balance) return buckets;
    const currencyCode = invoice.currency || "UGX";
    const due = invoice.due_date ? new Date(invoice.due_date + "T00:00:00") : null;
    const today = new Date(todayKey + "T00:00:00");
    const lateDays = due ? Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000)) : 0;
    const bucket = !due || lateDays === 0 ? "current" : lateDays <= 15 ? "days1to15" : lateDays <= 30 ? "days16to30" : lateDays <= 45 ? "days31to45" : "over45";
    buckets[bucket][currencyCode] = (buckets[bucket][currencyCode] || 0) + balance;
    return buckets;
  }, { current: {} as Record<string, number>, days1to15: {} as Record<string, number>, days16to30: {} as Record<string, number>, days31to45: {} as Record<string, number>, over45: {} as Record<string, number> });
  const currencyTotal = (values: Record<string, number>, code = "UGX") => money(values[code] || 0, code);
  const receivableTotalUGX = Object.values(outstandingByAge).reduce((sum, values) => sum + (values.UGX || 0), 0);
  const paidTotalUGX = invoices.reduce((sum, invoice) => sum + (invoice.currency === "UGX" ? Number(invoice.amount_paid || 0) : 0), 0);
  const chartMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (11 - index));
    const key = date.toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" }).slice(0, 7);
    return { key, label: date.toLocaleDateString("en-UG", { month: "short", timeZone: "Africa/Kampala" }), sales: 0, expenses: 0 };
  });
  chartMonths.forEach(month => {
    month.sales = invoices.filter(invoice => invoice.currency === "UGX" && !["draft","void","cancelled"].includes(String(invoice.status).toLowerCase()) && String(invoice.issue_date || "").slice(0, 7) === month.key).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    month.expenses = expenses.filter(expense => expense.currency === "UGX" && String(expense.expense_date || "").slice(0, 7) === month.key).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  });
  const chartMax = Math.max(1, ...chartMonths.flatMap(month => [month.sales, month.expenses]));
  const chartBars = chartMonths.map((month, index) => ({ ...month, x: 42 + index * 54, salesHeight: month.sales / chartMax * 142, expenseHeight: month.expenses / chartMax * 142 }));
  const otherCurrencyReceivables = Object.entries(outstandingByAge.current).filter(([code]) => code !== "UGX");

  return <main className="inner-page invoice-product-page finance-shell">
    <aside className="finance-side-rail">
      <Link className="finance-side-brand" href="/workspace"><span>JOHDEN</span><small>BUSINESS SUITE</small></Link>
      <div className="finance-side-workspace"><span className="finance-side-mark">J</span><div><b>Johden Business</b><small>Finance workspace</small></div></div>
      <p className="finance-side-label">WORKSPACE</p>
      <nav className="finance-side-nav" aria-label="Finance navigation">
        <a className="selected" href="#overview"><span>▦</span> Overview</a>
        <Link href="#customers"><span>♙</span> Customers <i>{customers.length}</i></Link>
        <Link href="/workspace/finance/items"><span>▧</span> Items</Link>
        <Link href="/workspace/finance/quotes"><span>▧</span> Quotes</Link>
        <a href="#invoice-list"><span>▤</span> Invoices <i>{invoices.length}</i></a>
        <Link href="/workspace/finance/receipts"><span>▤</span> Sales Receipts</Link>
        <Link href="/workspace/finance/recurring"><span>⟳</span> Recurring Invoices</Link>
        <a href="#invoice-list"><span>⇄</span> Payments Received</a>
        <Link href="/workspace/finance/credit-notes"><span>▱</span> Credit Notes</Link>
        <a href="#expense-list"><span>↗</span> Expenses</a>
        <Link href="/workspace/finance/recurring"><span>⟳</span> Recurring Expenses</Link>
        <Link href="/workspace/finance/time-tracking"><span>◷</span> Time Tracking</Link>
        <a href="#overview"><span>▥</span> Reports</a>
      </nav>
      <p className="finance-side-label">QUICK ACTIONS</p>
      <nav className="finance-side-nav">
        <a href="#create-invoice"><span>＋</span> Create invoice</a>
        <a href="#add-customer"><span>＋</span> Add customer</a>
        <a href="#add-expense"><span>＋</span> Add expense</a>
      </nav>
      <div className="finance-side-bottom"><span className="finance-side-mark">J</span><div><b>Johden Business</b><small>Billing &amp; accounts</small></div></div>
      <Link className="finance-side-back" href="/workspace">← Back to workspace</Link>
      <form action="/api/saas/logout" method="post"><button className="finance-side-signout" type="submit">↪ Sign out</button></form>
    </aside>
    <div className="finance-app-main">
    <header className="finance-topbar">
      <div className="finance-topbar-search"><span aria-hidden="true">⌕</span><input aria-label="Search customers and invoices" value={globalSearch} onChange={event=>{setGlobalSearch(event.target.value);setInvoiceSearch("");setCustomerSearch("");}} placeholder="Search in customers and invoices" /></div>
      <div className="finance-topbar-actions"><span className="finance-company-name">JOHDEN BUSINESS CONSULTANCY SERVICES</span><Link href="/workspace" aria-label="Workspace settings" className="finance-topbar-icon">⚙</Link><Link href="#create-invoice" className="finance-topbar-add">＋</Link><span className="finance-profile-mark" aria-label="Johden account">J</span></div>
    </header>
    <section className="finance-dashboard-heading">
      <div><span className="eyebrow dark"><i /> PRIVATE FINANCE WORKSPACE</span><h1>Good afternoon, Johden</h1><p>Your business finances at a glance. Monitor receivables, monthly sales and expenses from one place.</p></div>
      <Link className="button button-primary" href="#create-invoice">＋ New invoice</Link>
    </section>
    <section className="inner-content">
      <div id="overview" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:18,flexWrap:"wrap",marginBottom:24}}><div><span className="eyebrow dark"><i/> FINANCE OVERVIEW</span><h2 style={{fontFamily:"Manrope,sans-serif",fontSize:"clamp(28px,3vw,40px)",margin:"10px 0 0"}}>Your business, at a glance.</h2></div><a className="button button-primary" href="#invoice-list">View invoices ↗</a></div>
      {error && <p role="alert" className="admin-error">{error}</p>}{notice && <p role="status" className="admin-success">{notice}</p>}
      <section className="finance-receivables-card" aria-labelledby="receivables-title">
        <div className="finance-panel-heading"><div><h3 id="receivables-title">Total receivables</h3><p>Outstanding issued invoices · UGX view</p></div><a href="#create-invoice" className="finance-new-link">＋ New invoice</a></div>
        <div className="finance-receivables-total">{money(receivableTotalUGX, "UGX")}</div>
        <div className="finance-receivables-track" aria-hidden="true">
          <span style={{width: `${receivableTotalUGX ? (Object.values(outstandingByAge.current).reduce((a,b)=>a+b,0)/Math.max(1,receivableTotalUGX))*100 : 0}%`}} />
          <span style={{width: `${receivableTotalUGX ? (Object.values(outstandingByAge.days1to15).reduce((a,b)=>a+b,0)/Math.max(1,receivableTotalUGX))*100 : 0}%`}} />
          <span style={{width: `${receivableTotalUGX ? (Object.values(outstandingByAge.days16to30).reduce((a,b)=>a+b,0)/Math.max(1,receivableTotalUGX))*100 : 0}%`}} />
          <span style={{width: `${receivableTotalUGX ? (Object.values(outstandingByAge.days31to45).reduce((a,b)=>a+b,0)/Math.max(1,receivableTotalUGX))*100 : 0}%`}} />
          <span style={{width: `${receivableTotalUGX ? (Object.values(outstandingByAge.over45).reduce((a,b)=>a+b,0)/Math.max(1,receivableTotalUGX))*100 : 0}%`}} />
        </div>
        <div className="finance-ageing-grid">
          <div><small>Current</small><strong>{currencyTotal(outstandingByAge.current)}</strong></div>
          <div><small>1–15 days</small><strong>{currencyTotal(outstandingByAge.days1to15)}</strong></div>
          <div><small>16–30 days</small><strong>{currencyTotal(outstandingByAge.days16to30)}</strong></div>
          <div><small>31–45 days</small><strong>{currencyTotal(outstandingByAge.days31to45)}</strong></div>
          <div><small>Above 45 days</small><strong>{currencyTotal(outstandingByAge.over45)}</strong></div>
        </div>
        {otherCurrencyReceivables.length>0 && <p className="finance-currency-note">Other currencies currently due: {otherCurrencyReceivables.map(([code,amount])=>money(amount,code)).join(" · ")}. Currency balances are kept separate.</p>}
      </section>
      <section className="finance-analytics-grid">
        <article className="finance-analytics-card">
          <div className="finance-panel-heading"><div><h3>Sales and expenses</h3><p>Last 12 months · UGX only</p></div><span className="finance-period-label">12 MONTHS</span></div>
          <div className="finance-chart-layout">
            <div className="finance-chart" role="img" aria-label="Monthly UGX invoice sales and expenses for the last twelve months">
              <div className="finance-chart-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0</span></div>
              <svg viewBox="0 0 700 190" preserveAspectRatio="none" aria-hidden="true">
                {[18,54,90,126,162].map(y=><line key={y} x1="34" x2="690" y1={y} y2={y} stroke="#e9ebef" strokeDasharray="3 4" />)}
                {chartBars.map((bar,index)=><g key={bar.key}>
                  <rect x={bar.x} y={162-bar.salesHeight} width="13" height={bar.salesHeight} rx="2" fill="#3687e8"/>
                  <rect x={bar.x+16} y={162-bar.expenseHeight} width="13" height={bar.expenseHeight} rx="2" fill="#31bd83"/>
                  {index%2===0 && <text x={bar.x+14} y="183" textAnchor="middle" fontSize="10" fill="#747b87">{bar.label}</text>}
                </g>)}
              </svg>
            </div>
            <div className="finance-chart-summary">
              <div><small>Total sales invoiced</small><strong>{money(chartMonths.reduce((sum,m)=>sum+m.sales,0),"UGX")}</strong></div>
              <div><small>Payments received</small><strong>{money(paidTotalUGX,"UGX")}</strong></div>
              <div><small>Total expenses</small><strong>{money(chartMonths.reduce((sum,m)=>sum+m.expenses,0),"UGX")}</strong></div>
            </div>
          </div>
          <div className="finance-chart-legend"><span><i className="sales-dot"/>Sales invoiced</span><span><i className="expenses-dot"/>Expenses</span></div>
          <p className="finance-data-note">Figures are calculated from records currently loaded in this workspace. Non-UGX values are not converted or combined.</p>
        </article>
        <div className="finance-kpi-stack">
          <article><small>Customers</small><strong>{customers.length}</strong><span>Saved customer records</span></article>
          <article><small>Draft invoices</small><strong>{draftCount}</strong><span>Awaiting review or issue</span></article>
          <article><small>Invoices</small><strong>{invoices.length}</strong><span>{formatTotals(invoiceTotalsByCurrency)} total value</span></article>
          <article><small>Total expenses</small><strong>{formatTotals(expenseTotalsByCurrency)}</strong><span>{expenses.length} expense records across all dates</span></article>
        </div>
      </section>
      <div className="invoice-feature-grid" id="customers">
        <article className="invoice-feature-card" id="add-customer"><h3>Add a customer</h3><form className="admin-client-form" onSubmit={createCustomer}><label>Customer or company name<input required minLength={2} maxLength={160} value={customerName} onChange={e=>setCustomerName(e.target.value)} /></label><div className="finance-form-two"><label>Email (optional)<input type="email" maxLength={254} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} /></label><label>Telephone<input type="tel" maxLength={40} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+256..." /></label></div><label>Billing address<textarea rows={2} maxLength={500} value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="Street, city, country" /></label><label>Tax identification number<input maxLength={100} value={customerTaxNumber} onChange={e=>setCustomerTaxNumber(e.target.value)} /></label><button type="submit" disabled={busy}>Save customer</button></form></article>
        <article className="invoice-feature-card" id="create-invoice"><h3>Create a draft invoice</h3>{customers.length===0 && <p>Add a customer first to create an invoice.</p>}<form className="admin-client-form" onSubmit={createInvoice}><label>Customer<select required value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}><option value="">Choose customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Description<input required maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} /></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Quantity<input required type="number" min="0.001" step="0.001" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><label>Unit price<input required type="number" min="0" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e=>setTaxRate(e.target.value)} /></label><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>UGX</option><option>USD</option><option>EUR</option><option>GBP</option><option>KES</option><option>TZS</option></select></label></div><label>Due date (optional)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label><button type="submit" disabled={busy || !customers.length || !selectedCustomer}>Create draft invoice</button></form></article>
      </div>
      <article className="invoice-feature-card" id="add-expense" style={{marginTop:24}}><h3>Record an expense</h3><form className="admin-client-form" onSubmit={createExpense}><label>Category<input required maxLength={100} value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} /></label><label>Description<input required maxLength={500} value={expenseDescription} onChange={e=>setExpenseDescription(e.target.value)} /></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Amount<input required type="number" min="0" step="0.01" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} /></label><label>Currency<select value={expenseCurrency} onChange={e=>setExpenseCurrency(e.target.value)}><option>UGX</option><option>USD</option><option>EUR</option><option>GBP</option><option>KES</option><option>TZS</option></select></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Date<input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} /></label><label>Payment method<select value={expenseMethod} onChange={e=>setExpenseMethod(e.target.value)}><option value="other">Other</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option></select></label></div><label>Notes (optional)<textarea rows={2} maxLength={2000} value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} placeholder="Additional details or receipt reference" /></label><button type="submit" disabled={busy}>Save expense</button></form></article>
      <article className="invoice-feature-card" style={{marginTop:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><div><h3 style={{marginBottom:6}}>Customer directory</h3><p style={{margin:0}}>Find a saved customer and use their record when preparing an invoice.</p></div><span>{customers.length} {customers.length===1?"customer":"customers"}</span></div>
        <label style={{display:"block",marginTop:16}}>Search customers<input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Search by name or email" /></label>
        {filteredCustomers.length===0 ? <p style={{marginTop:16}}>{customers.length===0?"Your directory is empty. Add your first customer above.":"No customers match that search."}</p> : <div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:10}}>Customer</th><th style={{padding:10}}>Email / telephone</th><th style={{padding:10}}>Billing address</th><th style={{padding:10}}>Action</th></tr></thead><tbody>{filteredCustomers.map(customer=><tr key={customer.id}><td style={{padding:10}}><strong>{customer.name}</strong>{customer.tax_number && <small className="finance-table-subline">Tax ID: {customer.tax_number}</small>}</td><td style={{padding:10}}>{customer.email||"—"}<small className="finance-table-subline">{customer.phone||"No telephone"}</small></td><td style={{padding:10}}>{customer.address||"—"}</td><td style={{padding:10}}><button type="button" onClick={()=>{setSelectedCustomer(customer.id);setNotice(customer.name+" selected for the invoice form.");window.scrollTo({top:0,behavior:"smooth"});}}>Use for invoice</button></td></tr>)}</tbody></table></div>}
      </article>
      <div id="invoice-list" className="invoice-list-panel" style={{marginTop:32,background:"#fff",border:"1px solid #ece7e6",borderRadius:12,padding:20}}><div className="invoice-list-heading"><div><span className="eyebrow dark"><i/> BILLING REGISTER</span><h2>Invoices</h2><p>Search, review, and print invoices saved in this workspace.</p></div><input aria-label="Search invoices" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)} placeholder="Search invoice, customer or status" /></div>{filteredInvoices.length===0 ? <p>{invoiceSearch ? "No invoices match your search." : "No invoices yet. Create your first draft above."}</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12}}>Invoice</th><th style={{padding:12}}>Date</th><th style={{padding:12}}>Customer</th><th style={{padding:12}}>Total</th><th style={{padding:12}}>Balance</th><th style={{padding:12}}>Status</th><th style={{padding:12}}>Actions</th></tr></thead><tbody>{filteredInvoices.map(i=><tr key={i.id}><td style={{padding:12}}>{i.invoice_number}</td><td style={{padding:12}}>{i.issue_date}</td><td style={{padding:12}}>{i.business_contacts?.name || "Customer"}</td><td style={{padding:12}}>{money(i.total,i.currency)}</td><td style={{padding:12}}><strong>{money(Math.max(0,Number(i.total||0)-Number(i.amount_paid||0)),i.currency)}</strong></td><td style={{padding:12}}><span className={`finance-status-pill finance-status-${String(i.status).toLowerCase().replace(/[^a-z0-9]+/g,"-")}`}>{i.status.replace(/_/g," ")}</span></td><td style={{padding:12,display:"flex",gap:10,flexWrap:"wrap"}}>{i.status === "draft" && <><button type="button" disabled={busy} onClick={() => editDraftInvoice(i)}>Edit draft</button><button type="button" disabled={busy} onClick={() => issueInvoice(i)}>Issue invoice</button></>}{["sent","part_paid","overdue"].includes(i.status) && Number(i.total || 0) > Number(i.amount_paid || 0) && <button type="button" disabled={busy} onClick={() => recordPayment(i)}>Record payment</button>}<Link href={`/workspace/invoices/${i.id}/print`} target="_blank">Print / Save PDF</Link></td></tr>)}</tbody></table></div>}</div>
      <div id="expense-list" style={{marginTop:32,background:"#fff",border:"1px solid #ece7e6",borderRadius:12,padding:20}}><h2>Expenses</h2>{expenses.length===0 ? <p>No expenses recorded yet.</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12}}>Date</th><th style={{padding:12}}>Category</th><th style={{padding:12}}>Description</th><th style={{padding:12}}>Amount</th><th style={{padding:12}}>Method</th></tr></thead><tbody>{expenses.map(e=><tr key={e.id}><td style={{padding:12}}>{e.expense_date}</td><td style={{padding:12}}>{e.category}</td><td style={{padding:12}}>{e.description}</td><td style={{padding:12}}>{money(e.amount,e.currency)}</td><td style={{padding:12}}>{e.payment_method.replace("_"," ")}</td></tr>)}</tbody></table></div>}</div>
      {dialog && activeInvoice && <div role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy){setDialog(null);setActiveInvoice(null);}}} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(24,20,22,.62)",display:"grid",placeItems:"center",padding:20}}>
        <section role="dialog" aria-modal="true" aria-labelledby="invoice-dialog-title" style={{width:"min(100%,520px)",maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:18,padding:26,boxShadow:"0 24px 80px rgba(0,0,0,.24)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:16}}><div><span className="eyebrow dark"><i/> {dialog==="edit"?"DRAFT INVOICE":"PAYMENT ENTRY"}</span><h2 id="invoice-dialog-title" style={{margin:"8px 0 4px"}}>{dialog==="edit"?"Edit invoice":"Record a payment"}</h2><p style={{margin:0,color:"#6d6870"}}>{activeInvoice.invoice_number} · {activeInvoice.business_contacts?.name || "Customer"}</p></div><button type="button" disabled={busy} aria-label="Close dialog" onClick={()=>{setDialog(null);setActiveInvoice(null);}} style={{border:0,background:"#f4f1f1",borderRadius:10,width:38,height:38,fontSize:20}}>×</button></div>
          {dialog==="edit" ? <form className="admin-client-form" onSubmit={saveDraftInvoice} style={{marginTop:22,display:"grid",gap:16}}>
            <label>Due date<input type="date" min={activeInvoice.issue_date} value={editDueDate} onChange={e=>setEditDueDate(e.target.value)} /></label>
            <label>Invoice notes<textarea rows={4} maxLength={2000} value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Add payment terms or a note for this invoice" /></label>
            <p style={{fontSize:13,color:"#777"}}>Only draft invoices can be edited. Leave the due date blank if no due date applies.</p>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button type="button" disabled={busy} onClick={()=>{setDialog(null);setActiveInvoice(null);}}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy?"Saving…":"Save changes"}</button></div>
          </form> : <form className="admin-client-form" onSubmit={submitPayment} style={{marginTop:22,display:"grid",gap:16}}>
            <div style={{background:"#fff5f2",padding:14,borderRadius:12}}><small>Outstanding balance</small><strong style={{display:"block",fontSize:22,marginTop:4}}>{money(Math.max(0,Number(activeInvoice.total||0)-Number(activeInvoice.amount_paid||0)),activeInvoice.currency)}</strong></div>
            <label>Amount received ({activeInvoice.currency})<input type="number" min="0.01" max={Math.max(0,Number(activeInvoice.total||0)-Number(activeInvoice.amount_paid||0))} step="0.01" required value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} /></label>
            <label>Payment method<select required value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="other">Other</option></select></label>
            <label>Payment date<input type="date" required max={new Date().toISOString().slice(0,10)} value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} /></label>
            <label>Payment reference (optional)<input maxLength={120} value={paymentReference} onChange={e=>setPaymentReference(e.target.value)} placeholder="Bank or mobile money reference" /></label>
            <p style={{fontSize:13,color:"#777"}}>This records a payment against the invoice. It does not initiate a bank or mobile-money transfer.</p>
            <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><button type="button" disabled={busy} onClick={()=>{setDialog(null);setActiveInvoice(null);}}>Cancel</button><button className="button button-primary" type="submit" disabled={busy}>{busy?"Recording…":"Record payment"}</button></div>
          </form>}
        </section>
      </div>}
      <p style={{marginTop:20,fontSize:13,opacity:.8}}>This is an initial workspace module. Email delivery, payment recording and subscription checkout remain disabled until provider credentials and secure payment webhooks are configured and tested.</p>
    </section>
    </div>
  </main>;
}
