"use client";

import { useMemo, useState } from "react";

type NavItem = { label: string; icon: string };
const nav: NavItem[] = [
  { label: "Overview", icon: "▦" },
  { label: "Invoices", icon: "▤" },
  { label: "Quotes", icon: "▧" },
  { label: "Customers", icon: "♙" },
  { label: "Expenses", icon: "↗" },
  { label: "Payments", icon: "⇄" },
  { label: "Reports", icon: "▥" },
];

const invoices = [
  { id: "JBCS-INV-001", client: "Kampala Creative Hub", date: "03 Nov 2026", due: "10 Nov 2026", amount: 2450000, status: "Paid" },
  { id: "JBCS-INV-002", client: "Nile View Enterprises", date: "01 Nov 2026", due: "08 Nov 2026", amount: 3800000, status: "Pending" },
  { id: "JBCS-INV-003", client: "Greenfield Supplies Ltd", date: "28 Oct 2026", due: "04 Nov 2026", amount: 1275000, status: "Overdue" },
  { id: "JBCS-INV-004", client: "Bright Path Foundation", date: "26 Oct 2026", due: "09 Nov 2026", amount: 1650000, status: "Draft" },
];

const money = (amount: number) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);

export default function FinanceDashboard() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = useMemo(() => invoices.filter((invoice) => [invoice.id, invoice.client, invoice.status].join(" ").toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <main className="finance-app">
      <aside className="finance-sidebar">
        <a className="finance-brand" href="/" aria-label="Johden home"><img src="/johden-logo.svg" alt="Johden Business Consultancy Services" /></a>
        <div className="finance-workspace"><span className="workspace-mark">J</span><span><b>Johden Finance</b><small>Business workspace</small></span><span className="workspace-chevron">⌄</span></div>
        <p className="finance-nav-label">WORKSPACE</p>
        <nav className="finance-nav" aria-label="Finance navigation">
          {nav.map((item) => <button key={item.label} className={active === item.label ? "finance-nav-item active" : "finance-nav-item"} onClick={() => { setActive(item.label); setNotice(""); }}><span className="finance-nav-icon">{item.icon}</span>{item.label}{item.label === "Invoices" && <span className="nav-count">4</span>}</button>)}
        </nav>
        <div className="finance-sidebar-bottom"><div className="finance-help-icon">?</div><div><b>Need a hand?</b><small>Contact your workspace admin</small></div></div>
        <a className="finance-back-link" href="/">← Back to Johden website</a>
      </aside>

      <section className="finance-main">
        <header className="finance-topbar">
          <div className="finance-breadcrumb">Johden Finance <span>/</span> {active}</div>
          <div className="finance-top-actions"><span className="finance-currency">UGX <span>⌄</span></span><button className="finance-icon-button" aria-label="Notifications" onClick={() => setNotice("You are all caught up on notifications.")}>♧</button><span className="finance-avatar">J</span><div className="finance-user"><b>Johden Admin</b><small>Administrator</small></div></div>
        </header>

        <div className="finance-content">
          <div className="finance-page-heading"><div><p className="finance-eyebrow">FINANCIAL CONTROL CENTRE</p><h1>{active === "Overview" ? "Good afternoon, Johden" : active}</h1><p className="finance-subtitle">{active === "Overview" ? "Here’s what’s happening with your business finances." : `Manage your ${active.toLowerCase()} in one organised workspace.`}</p></div><button className="finance-primary-button" onClick={() => setShowCreate(true)}>＋ {active === "Overview" ? "Create invoice" : `New ${active === "Invoices" ? "invoice" : active === "Quotes" ? "quote" : active === "Expenses" ? "expense" : active === "Customers" ? "customer" : active === "Payments" ? "payment" : "report"}`}</button></div>
          {notice && <div className="finance-notice">{notice}</div>}

          {active === "Overview" ? <>
            <div className="finance-stat-grid">
              <article className="finance-stat-card"><div className="finance-stat-top"><span>Total revenue</span><span className="finance-stat-icon red">↗</span></div><strong>{money(18450000)}</strong><p><span className="finance-positive">↑ 12.8%</span> <span>vs last month</span></p><div className="finance-mini-bars">{[25,37,30,48,40,60,53,72,62,88,74,100].map((h,i)=><i key={i} style={{height: h+"%"}} />)}</div></article>
              <article className="finance-stat-card"><div className="finance-stat-top"><span>Outstanding</span><span className="finance-stat-icon orange">◷</span></div><strong>{money(6725000)}</strong><p><span className="finance-muted">Across 8 invoices</span></p><div className="finance-stat-foot"><span className="finance-dot orange-dot" /> Follow up on pending payments</div></article>
              <article className="finance-stat-card"><div className="finance-stat-top"><span>Total expenses</span><span className="finance-stat-icon dark">↘</span></div><strong>{money(4930000)}</strong><p><span className="finance-positive">↓ 4.2%</span> <span>vs last month</span></p><div className="finance-stat-foot"><span className="finance-dot red-dot" /> 24 expense records</div></article>
              <article className="finance-stat-card"><div className="finance-stat-top"><span>Net income</span><span className="finance-stat-icon green">✳</span></div><strong>{money(13520000)}</strong><p><span className="finance-positive">↑ 8.6%</span> <span>vs last month</span></p><div className="finance-stat-foot"><span className="finance-dot green-dot" /> Revenue minus expenses</div></article>
            </div>
            <div className="finance-panel-grid">
              <article className="finance-panel finance-revenue-panel"><div className="finance-panel-heading"><div><h2>Cash flow overview</h2><p>Income and expenses at a glance</p></div><select aria-label="Cash flow period" defaultValue="6"><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></div><div className="finance-chart-legend"><span><i className="legend-income" /> Income</span><span><i className="legend-expense" /> Expenses</span></div><div className="finance-chart">{[{m:"Jun",a:48,b:24},{m:"Jul",a:64,b:33},{m:"Aug",a:53,b:29},{m:"Sep",a:78,b:38},{m:"Oct",a:68,b:31},{m:"Nov",a:91,b:43}].map((d)=><div className="finance-chart-column" key={d.m}><div className="finance-bar-pair"><i className="income-bar" style={{height:d.a+"%"}}/><i className="expense-bar" style={{height:d.b+"%"}}/></div><small>{d.m}</small></div>)}</div><p className="finance-demo-note">Illustrative preview · connect your records to show actual figures.</p></article>
              <article className="finance-panel"><div className="finance-panel-heading"><div><h2>Invoice summary</h2><p>Current invoice status</p></div><button className="finance-text-button" onClick={() => setActive("Invoices")}>View all →</button></div><div className="finance-invoice-summary"><div className="summary-ring"><div><b>24</b><small>Invoices</small></div></div><div className="summary-legend"><p><i className="status-paid" /><span>Paid</span><b>14</b></p><p><i className="status-pending" /><span>Pending</span><b>6</b></p><p><i className="status-overdue" /><span>Overdue</span><b>3</b></p><p><i className="status-draft" /><span>Draft</span><b>1</b></p></div></div></article>
            </div>
          </> : <article className="finance-panel finance-table-panel"><div className="finance-panel-heading"><div><h2>{active} overview</h2><p>Review and manage your business records.</p></div><input className="finance-search" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search records..." /></div>{active === "Invoices" ? <InvoiceTable rows={filtered} /> : <div className="finance-empty"><div className="finance-empty-icon">✦</div><h3>{active} workspace</h3><p>This section is ready for its next implementation stage. Your existing website pages remain unchanged.</p><button className="finance-primary-button" onClick={()=>setShowCreate(true)}>＋ Create {active === "Quotes" ? "quote" : active === "Expenses" ? "expense" : active === "Customers" ? "customer" : active === "Payments" ? "payment" : "report"}</button></div>}</article>}

          {active === "Overview" && <article className="finance-panel finance-recent-panel"><div className="finance-panel-heading"><div><h2>Recent invoices</h2><p>Keep track of your latest billing activity</p></div><button className="finance-text-button" onClick={() => setActive("Invoices")}>All invoices →</button></div><InvoiceTable rows={invoices.slice(0,4)} /></article>}
          <footer className="finance-footer"><span>© {new Date().getFullYear()} Johden Business Consultancy Services</span><span>Designed for clarity. Built for growth. <i>●</i></span></footer>
        </div>
      </section>

      {showCreate && <div className="finance-modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setShowCreate(false)}}><section className="finance-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><button className="finance-modal-close" onClick={()=>setShowCreate(false)} aria-label="Close">×</button><p className="finance-eyebrow">JOHDEN FINANCE</p><h2 id="create-title">Create your first {active === "Overview" || active === "Invoices" ? "invoice" : active === "Quotes" ? "quote" : active === "Expenses" ? "expense" : active === "Customers" ? "customer" : active === "Payments" ? "payment" : "report"}</h2><p className="finance-subtitle">This is a visual prototype. Saving financial records will be enabled when the data model and secure database are connected.</p><label>Record name<input placeholder="e.g. Consulting services for client" /></label><label>Amount (UGX)<input type="number" min="0" placeholder="0" /></label><label>Notes<textarea placeholder="Add details (optional)" rows={3}/></label><div className="finance-modal-actions"><button className="finance-secondary-button" onClick={()=>setShowCreate(false)}>Cancel</button><button className="finance-primary-button" onClick={()=>{setShowCreate(false);setNotice("Prototype only: no financial record was saved. Next step is connecting secure database storage.");}}>Continue</button></div></section></div>}
    </main>
  );
}

function InvoiceTable({ rows }: { rows: typeof invoices }) {
  return <div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>INVOICE</th><th>CUSTOMER</th><th>ISSUED</th><th>DUE DATE</th><th>AMOUNT</th><th>STATUS</th></tr></thead><tbody>{rows.length ? rows.map((row)=><tr key={row.id}><td><b className="invoice-id">{row.id}</b></td><td>{row.client}</td><td>{row.date}</td><td>{row.due}</td><td className="invoice-amount">{money(row.amount)}</td><td><span className={"invoice-status "+row.status.toLowerCase()}>{row.status}</span></td></tr>) : <tr><td colSpan={6} className="finance-no-results">No invoices match your search.</td></tr>}</tbody></table></div>;
}
