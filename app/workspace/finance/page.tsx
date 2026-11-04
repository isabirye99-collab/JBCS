"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = { id: string; name: string; email?: string | null };
type Invoice = { id: string; invoice_number: string; issue_date: string; due_date?: string | null; currency: string; total: number; amount_paid: number; status: string; business_contacts?: { name?: string } | null };
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

    setError(errors.join(" "));
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

  async function editDraftInvoice(invoice: Invoice) {
    const dueDate = window.prompt("Due date (YYYY-MM-DD; leave blank to clear)", invoice.due_date || "");
    if (dueDate === null) return;
    const notes = window.prompt("Invoice notes (leave blank to clear)", "");
    if (notes === null) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: invoice.id, due_date: dueDate, notes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update invoice.");
      setNotice("Draft invoice details updated."); await load();
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

  async function recordPayment(invoice: Invoice) {
    const balance = Math.max(0, Number(invoice.total || 0) - Number(invoice.amount_paid || 0));
    if (balance <= 0) { setError("This invoice has no outstanding balance."); return; }
    const amountText = window.prompt(`Outstanding balance: ${money(balance, invoice.currency)}\nEnter payment amount in ${invoice.currency}:`, balance.toFixed(2));
    if (amountText === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a valid positive payment amount."); return; }
    const method = window.prompt("Payment method: cash, bank_transfer, mobile_money, card, cheque, other", "bank_transfer");
    if (method === null) return;
    const paymentDate = window.prompt("Payment date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (paymentDate === null) return;
    const reference = window.prompt("Payment reference (optional)", "") ?? "";
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/saas/payments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoice.id, amount, method, payment_date: paymentDate, payment_reference: reference }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not record payment.");
      setNotice(`Payment recorded for ${invoice.invoice_number}. New status: ${data.payment.status.replace("_", " ")}.`);
      await load();
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
    month.sales = invoices.filter(invoice => invoice.currency === "UGX" && String(invoice.issue_date || "").slice(0, 7) === month.key).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
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
        <a href="#invoice-list"><span>▤</span> Invoices <i>{invoices.length}</i></a>
        <a href="#customers"><span>♙</span> Customers <i>{customers.length}</i></a>
        <a href="#expense-list"><span>↗</span> Expenses</a>
      </nav>
      <p className="finance-side-label">QUICK ACTIONS</p>
      <nav className="finance-side-nav">
        <a href="#create-invoice"><span>＋</span> Create invoice</a>
        <a href="#add-customer"><span>＋</span> Add customer</a>
      </nav>
      <div className="finance-side-bottom"><span className="finance-side-mark">J</span><div><b>Johden Business</b><small>Billing &amp; accounts</small></div></div>
      <Link className="finance-side-back" href="/workspace">← Back to workspace</Link>
      <form action="/api/saas/logout" method="post"><button className="finance-side-signout" type="submit">↪ Sign out</button></form>
    </aside>
    <div className="finance-app-main">
    <header className="finance-topbar">
      <div className="finance-topbar-search"><span aria-hidden="true">⌕</span><input aria-label="Search customers and invoices" value={globalSearch} onChange={event=>{setGlobalSearch(event.target.value);setInvoiceSearch("");setCustomerSearch("");}} placeholder="Search in customers and invoices" /></div>
      <div className="finance-topbar-actions"><span className="finance-company-name">JOHDEN BUSINESS CONSULTANCY SERVICES</span><Link href="/workspace" aria-label="Workspace settings" className="finance-topbar-icon">⚙</Link><Link href="#create-invoice" className="finance-topbar-add">＋</Link><span className="finance-profile-mark" aria-label="Johden account">J</span></div>
    </header><Link className="brand" href="/workspace"><span style={{color:"#f3192d",fontWeight:800}}>JOHDEN</span>&nbsp; BUSINESS TOOLS</Link><nav className="desktop-nav"><Link href="/workspace">Workspace</Link><a href="#overview">Overview</a><a href="#customers">Customers</a><a href="#invoice-list">Invoices</a><a href="#expense-list">Expenses</a><Link href="/invoicing">Product site</Link></nav><form action="/api/saas/logout" method="post"><button className="button button-secondary">Sign out</button></form></header>
    <section className="inner-hero invoice-product-hero"><div className="invoice-hero-copy"><span className="eyebrow dark"><i /> PRIVATE FINANCE WORKSPACE</span><h1>Customers, <em>invoices and expenses.</em></h1><p>Manage customer records, draft invoices and business expenses within your private company workspace. Invoices are not emailed and payments are not collected automatically.</p><a className="button button-primary" href="#invoice-list">Open invoice register ↓</a></div><div className="invoice-hero-art" aria-hidden="true"><svg viewBox="0 0 360 260" role="img"><defs><linearGradient id="invoicePaper" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#fff0ed"/></linearGradient><linearGradient id="invoiceAccent" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f3192d"/><stop offset="100%" stopColor="#9f1020"/></linearGradient></defs><circle cx="190" cy="128" r="112" fill="#fff0ed"/><circle cx="190" cy="128" r="88" fill="#ffe1df"/><g transform="translate(92 24) rotate(-7 90 105)"><rect x="12" y="10" width="166" height="208" rx="13" fill="#d9c9c7" opacity=".5"/><rect x="0" y="0" width="166" height="208" rx="13" fill="url(#invoicePaper)" stroke="#eadbd9"/><rect x="18" y="18" width="42" height="7" rx="3.5" fill="url(#invoiceAccent)"/><text x="18" y="45" fontSize="10" fontWeight="700" fill="#2b2527">INVOICE</text><text x="18" y="60" fontSize="7" fill="#84777a">JOHDEN BUSINESS CONSULTANCY</text><path d="M18 75H148" stroke="#eadfdd"/><text x="18" y="92" fontSize="7" fill="#8b7f81">BILL TO</text><rect x="18" y="99" width="78" height="5" rx="2.5" fill="#b9a9a8"/><rect x="18" y="109" width="58" height="4" rx="2" fill="#e0d4d2"/><path d="M18 128H148" stroke="#eadfdd"/><rect x="18" y="139" width="88" height="5" rx="2.5" fill="#e0d4d2"/><rect x="18" y="151" width="128" height="4" rx="2" fill="#eee5e3"/><rect x="18" y="161" width="128" height="4" rx="2" fill="#eee5e3"/><rect x="18" y="178" width="130" height="17" rx="5" fill="#fff0ed"/><text x="26" y="189" fontSize="7" fontWeight="700" fill="#a51b2b">TOTAL DUE</text><text x="110" y="190" fontSize="8" fontWeight="700" fill="#a51b2b">UGX</text></g><g transform="translate(220 152)"><circle cx="38" cy="38" r="35" fill="url(#invoiceAccent)"/><path d="M21 38l11 11 23-25" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></g><g fill="#f58220"><circle cx="70" cy="62" r="5"/><circle cx="278" cy="82" r="4"/><path d="M285 190l5 10 10 5-10 5-5 10-5-10-10-5 10-5z"/></g></svg><div className="invoice-art-caption"><span>✓</span><div><b>Clear, organised billing</b><small>Keep every invoice in view</small></div></div></div></section>
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
          <article><small>Expenses</small><strong>{expenses.length}</strong><span>{formatTotals(expenseTotalsByCurrency)} recorded</span></article>
        </div>
      </section>
      <div className="invoice-feature-grid" id="customers">
        <article className="invoice-feature-card" id="add-customer"><h3>Add a customer</h3><form className="admin-client-form" onSubmit={createCustomer}><label>Customer or company name<input required minLength={2} maxLength={160} value={customerName} onChange={e=>setCustomerName(e.target.value)} /></label><div className="finance-form-two"><label>Email (optional)<input type="email" maxLength={254} value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} /></label><label>Telephone<input type="tel" maxLength={40} value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="+256..." /></label></div><label>Billing address<textarea rows={2} maxLength={500} value={customerAddress} onChange={e=>setCustomerAddress(e.target.value)} placeholder="Street, city, country" /></label><label>Tax identification number<input maxLength={100} value={customerTaxNumber} onChange={e=>setCustomerTaxNumber(e.target.value)} /></label><button type="submit" disabled={busy}>Save customer</button></form></article>
        <article className="invoice-feature-card" id="create-invoice"><h3>Create a draft invoice</h3>{customers.length===0 && <p>Add a customer first to create an invoice.</p>}<form className="admin-client-form" onSubmit={createInvoice}><label>Customer<select required value={selectedCustomer} onChange={e=>setSelectedCustomer(e.target.value)}><option value="">Choose customer</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Description<input required maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} /></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Quantity<input required type="number" min="0.001" step="0.001" value={quantity} onChange={e=>setQuantity(e.target.value)} /></label><label>Unit price<input required type="number" min="0" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} /></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e=>setTaxRate(e.target.value)} /></label><label>Currency<select value={currency} onChange={e=>setCurrency(e.target.value)}><option>UGX</option><option>USD</option><option>EUR</option><option>GBP</option><option>KES</option><option>TZS</option></select></label></div><label>Due date (optional)<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></label><button type="submit" disabled={busy || !customers.length || !selectedCustomer}>Create draft invoice</button></form></article>
      </div>
      <article className="invoice-feature-card" style={{marginTop:24}}><h3>Record an expense</h3><form className="admin-client-form" onSubmit={createExpense}><label>Category<input required maxLength={100} value={expenseCategory} onChange={e=>setExpenseCategory(e.target.value)} /></label><label>Description<input required maxLength={500} value={expenseDescription} onChange={e=>setExpenseDescription(e.target.value)} /></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Amount<input required type="number" min="0" step="0.01" value={expenseAmount} onChange={e=>setExpenseAmount(e.target.value)} /></label><label>Currency<select value={expenseCurrency} onChange={e=>setExpenseCurrency(e.target.value)}><option>UGX</option><option>USD</option><option>EUR</option><option>GBP</option><option>KES</option><option>TZS</option></select></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}><label>Date<input type="date" required value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} /></label><label>Payment method<select value={expenseMethod} onChange={e=>setExpenseMethod(e.target.value)}><option value="other">Other</option><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="card">Card</option><option value="cheque">Cheque</option></select></label></div><label>Notes (optional)<textarea rows={2} maxLength={2000} value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} placeholder="Additional details or receipt reference" /></label><button type="submit" disabled={busy}>Save expense</button></form></article>
      <article className="invoice-feature-card" style={{marginTop:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}><div><h3 style={{marginBottom:6}}>Customer directory</h3><p style={{margin:0}}>Find a saved customer and use their record when preparing an invoice.</p></div><span>{customers.length} {customers.length===1?"customer":"customers"}</span></div>
        <label style={{display:"block",marginTop:16}}>Search customers<input value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)} placeholder="Search by name or email" /></label>
        {filteredCustomers.length===0 ? <p style={{marginTop:16}}>{customers.length===0?"Your directory is empty. Add your first customer above.":"No customers match that search."}</p> : <div style={{overflowX:"auto",marginTop:12}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:10}}>Customer</th><th style={{padding:10}}>Email</th><th style={{padding:10}}>Action</th></tr></thead><tbody>{filteredCustomers.map(customer=><tr key={customer.id}><td style={{padding:10}}>{customer.name}</td><td style={{padding:10}}>{customer.email||"—"}</td><td style={{padding:10}}><button type="button" onClick={()=>{setSelectedCustomer(customer.id);setNotice(customer.name+" selected for the invoice form.");window.scrollTo({top:0,behavior:"smooth"});}}>Use for invoice</button></td></tr>)}</tbody></table></div>}
      </article>
      <div id="invoice-list" className="invoice-list-panel" style={{marginTop:32,background:"#fff",border:"1px solid #ece7e6",borderRadius:12,padding:20}}><div className="invoice-list-heading"><div><span className="eyebrow dark"><i/> BILLING REGISTER</span><h2>Invoices</h2><p>Search, review, and print invoices saved in this workspace.</p></div><input aria-label="Search invoices" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)} placeholder="Search invoice, customer or status" /></div>{filteredInvoices.length===0 ? <p>{invoiceSearch ? "No invoices match your search." : "No invoices yet. Create your first draft above."}</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12}}>Invoice</th><th style={{padding:12}}>Date</th><th style={{padding:12}}>Customer</th><th style={{padding:12}}>Total</th><th style={{padding:12}}>Status</th><th style={{padding:12}}>Actions</th></tr></thead><tbody>{filteredInvoices.map(i=><tr key={i.id}><td style={{padding:12}}>{i.invoice_number}</td><td style={{padding:12}}>{i.issue_date}</td><td style={{padding:12}}>{i.business_contacts?.name || "Customer"}</td><td style={{padding:12}}>{money(i.total,i.currency)}</td><td style={{padding:12}}>{i.status}</td><td style={{padding:12,display:"flex",gap:10,flexWrap:"wrap"}}>{i.status === "draft" && <><button type="button" disabled={busy} onClick={() => editDraftInvoice(i)}>Edit draft</button><button type="button" disabled={busy} onClick={() => issueInvoice(i)}>Issue invoice</button></>}{["sent","part_paid","overdue"].includes(i.status) && Number(i.total || 0) > Number(i.amount_paid || 0) && <button type="button" disabled={busy} onClick={() => recordPayment(i)}>Record payment</button>}<Link href={`/workspace/invoices/${i.id}/print`} target="_blank">Print / Save PDF</Link></td></tr>)}</tbody></table></div>}</div>
      <div id="expense-list" style={{marginTop:32,background:"#fff",border:"1px solid #ece7e6",borderRadius:12,padding:20}}><h2>Expenses</h2>{expenses.length===0 ? <p>No expenses recorded yet.</p> : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left"}}><thead><tr><th style={{padding:12}}>Date</th><th style={{padding:12}}>Category</th><th style={{padding:12}}>Description</th><th style={{padding:12}}>Amount</th><th style={{padding:12}}>Method</th></tr></thead><tbody>{expenses.map(e=><tr key={e.id}><td style={{padding:12}}>{e.expense_date}</td><td style={{padding:12}}>{e.category}</td><td style={{padding:12}}>{e.description}</td><td style={{padding:12}}>{money(e.amount,e.currency)}</td><td style={{padding:12}}>{e.payment_method.replace("_"," ")}</td></tr>)}</tbody></table></div>}</div>
      <p style={{marginTop:20,fontSize:13,opacity:.8}}>This is an initial workspace module. Email delivery, payment recording and subscription checkout remain disabled until provider credentials and secure payment webhooks are configured and tested.</p>
    </section>
    </div>
  </main>;
}
