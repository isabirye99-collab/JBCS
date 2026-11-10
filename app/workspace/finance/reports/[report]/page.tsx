"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileBarChart, FileText, Receipt, Wallet, UsersRound, CreditCard, TrendingUp, PieChart, Download } from "lucide-react";

type Row = Record<string, unknown> & { id?: string; currency?: string; status?: string };
type Customer = Row & { name?: string; email?: string; phone?: string };
const reportOptions = [
  { slug: "sales", title: "Sales Report", description: "Sales by invoice and standalone sales receipt.", source: "Invoices and direct sales receipts", icon: TrendingUp },
  { slug: "expenses", title: "Expense Report", description: "Recorded expenses by category, date and supplier.", source: "Expense records", icon: Wallet },
  { slug: "supplier-payments", title: "Supplier Payments", description: "Supplier disbursements and payment history.", source: "Supplier payment records", icon: CreditCard },
  { slug: "owner-income", title: "Owner Income & Commissions", description: "Payments received against owner-income and commission entries.", source: "Owner-income entries and payment transactions", icon: Receipt },
  { slug: "customer-statements", title: "Customer Statements", description: "Customer invoices, payments and outstanding balances.", source: "Customer, invoice and payment records", icon: UsersRound },
  { slug: "profit-loss", title: "Profit & Loss", description: "Management view of sales and recorded expenses.", source: "Invoices, direct sales receipts and expenses", icon: FileBarChart },
  { slug: "balance-sheet", title: "Balance Sheet", description: "Review available financial position data and reconciliation gaps.", source: "Available finance records; not a reconciled general ledger", icon: FileText },
];
// Invoice amount_due is a balance, not the original revenue total.
const amountOf = (r: Row) => Number(r.total_amount ?? r.total ?? r.amount ?? r.paid_amount ?? r.amount_due ?? 0) || 0;
const dateOf = (r: Row) => String(r.issue_date ?? r.payment_date ?? r.expense_date ?? r.sale_date ?? r.earned_date ?? r.date ?? r.created_at ?? "").slice(0,10);
const textOf = (r: Row, ...keys: string[]) => { for (const key of keys) { const v=r[key]; if (v!==undefined && v!==null && String(v).trim()) return String(v); } return "—"; };
const money = (n: number, c = "UGX") => `${c} ${Math.round(n).toLocaleString("en-UG")}`;
const dateLabel = (d: string) => d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-UG",{day:"2-digit",month:"short",year:"numeric"}) : "—";

export default function FinanceReportDetailPage() {
  const params = useParams<{ report: string }>();
  const slug = Array.isArray(params.report) ? params.report[0] : params.report;
  const report = reportOptions.find(x => x.slug === slug) || reportOptions[0];
  const [customers,setCustomers] = useState<Customer[]>([]);
  const [invoices,setInvoices] = useState<Row[]>([]);
  const [payments,setPayments] = useState<Row[]>([]);
  const [expenses,setExpenses] = useState<Row[]>([]);
  const [supplierPayments,setSupplierPayments] = useState<Row[]>([]);
  const [ownerEntries,setOwnerEntries] = useState<Row[]>([]);
  const [ownerPayments,setOwnerPayments] = useState<Row[]>([]);
  const [salesReceipts,setSalesReceipts] = useState<Row[]>([]);
  const [customerId,setCustomerId] = useState("");
  const [start,setStart] = useState("");
  const [end,setEnd] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true); setError("");
      try {
        const paths = ["/api/saas/customers","/api/saas/invoices","/api/saas/payments","/api/saas/expenses","/api/saas/supplier-payments","/api/saas/owner-income","/api/saas/sales-receipts"];
        const responses = await Promise.all(paths.map(path => fetch(path,{cache:"no-store"})));
        const payloads = await Promise.all(responses.map(r => r.json()));
        const failed = responses.findIndex((r,i) => !r.ok || payloads[i]?.error || payloads[i]?.migration_required);
        if (failed >= 0) throw new Error(payloads[failed]?.error || `Could not load ${paths[failed].split("/").pop()} report data.`);
        if (!active) return;
        setCustomers(Array.isArray(payloads[0].customers) ? payloads[0].customers : []);
        setInvoices(Array.isArray(payloads[1].invoices) ? payloads[1].invoices : []);
        setPayments(Array.isArray(payloads[2].payments) ? payloads[2].payments : []);
        setExpenses(Array.isArray(payloads[3].expenses) ? payloads[3].expenses : []);
        setSupplierPayments(Array.isArray(payloads[4].payments) ? payloads[4].payments : []);
        setOwnerEntries(Array.isArray(payloads[5].entries) ? payloads[5].entries : []);
        setOwnerPayments(Array.isArray(payloads[5].payments) ? payloads[5].payments : []);
        setSalesReceipts(Array.isArray(payloads[6].receipts) ? payloads[6].receipts : []);
      } catch(e) { if(active) setError(e instanceof Error ? e.message : "Unable to load report data."); }
      finally { if(active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const inPeriod = (r: Row) => { const d=dateOf(r); return (!start || (d && d>=start)) && (!end || (d && d<=end)); };
  const periodInvoices = useMemo(()=>invoices.filter(inPeriod),[invoices,start,end]);
  const periodPayments = useMemo(()=>payments.filter(inPeriod),[payments,start,end]);
  const periodExpenses = useMemo(()=>expenses.filter(inPeriod),[expenses,start,end]);
  const periodSupplierPayments = useMemo(()=>supplierPayments.filter(inPeriod),[supplierPayments,start,end]);
  const periodOwnerPayments = useMemo(()=>ownerPayments.filter(inPeriod),[ownerPayments,start,end]);
  const periodSalesReceipts = useMemo(()=>salesReceipts.filter(inPeriod),[salesReceipts,start,end]);
  const customer = customers.find(c=>c.id===customerId) || null;
  const customerInvoices = periodInvoices.filter(i=>String(i.contact_id ?? (i.business_contacts as Row | undefined)?.id ?? "")===customerId);
  const customerInvoiceIds = new Set(customerInvoices.map(i=>String(i.id||"")));
  const customerPayments = periodPayments.filter(p=>customerInvoiceIds.has(String(p.invoice_id||"")));
  const totalInvoiced = periodInvoices.reduce((n,r)=>n+amountOf(r),0);
  const totalDirectSales = periodSalesReceipts.reduce((n,r)=>n+amountOf(r),0);
  const totalExpenses = periodExpenses.reduce((n,r)=>n+amountOf(r),0);
  const totalCollections = periodPayments.reduce((n,r)=>n+amountOf(r),0)+totalDirectSales;
  const outstanding = periodInvoices.reduce((n,r)=>n+Math.max(0,r.amount_due !== undefined && r.amount_due !== null ? Number(r.amount_due) : amountOf(r)-Number(r.amount_paid ?? r.paid_amount ?? 0)),0);
  const totalSupplierPaid = periodSupplierPayments.reduce((n,r)=>n+amountOf(r),0);
  const totalOwnerReceived = periodOwnerPayments.reduce((n,r)=>n+amountOf(r),0);
  const statementBalance = customerInvoices.reduce((n,r)=>n+Math.max(0,r.amount_due !== undefined && r.amount_due !== null ? Number(r.amount_due) : amountOf(r)-Number(r.amount_paid ?? r.paid_amount ?? 0)),0);
  const expenseCategories = useMemo(()=>{const m=new Map<string,number>(); for(const e of periodExpenses){const k=textOf(e,"category","expense_category");m.set(k,(m.get(k)||0)+amountOf(e));}return [...m.entries()].sort((a,b)=>b[1]-a[1]);},[periodExpenses]);
  const rows: Row[] = report.slug==="sales" ? [...periodInvoices.map(r=>({...r,__kind:"Invoice"})),...periodSalesReceipts.map(r=>({...r,__kind:"Sales receipt"}))] :
    report.slug==="expenses" ? periodExpenses :
    report.slug==="supplier-payments" ? periodSupplierPayments :
    report.slug==="owner-income" ? periodOwnerPayments.map(p=>({...p,__kind:"Payment",__entry:ownerEntries.find(e=>e.id===p.entry_id)})) : [];

  function exportCSV() {
    const data = report.slug==="customer-statements" ? [...customerInvoices,...customerPayments] : rows;
    const keys = report.slug==="customer-statements" ? ["date","reference","type","amount","status"] : ["__kind","invoice_number","receipt_number","description","category","supplier_name","payer","payment_date","expense_date","issue_date","amount","currency","status","payment_method","payment_reference"];
    const csv = [keys.join(","),...data.map(r=>keys.map(k=>JSON.stringify(k==="date"?dateOf(r):k==="reference"?textOf(r,"invoice_number","receipt_number","payment_reference","id"):k==="type"?(r.__kind||"Payment"):r[k]??"")).join(","))].join("\r\n");
    const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"}); const url=URL.createObjectURL(blob); const a=document.createElement("a");a.href=url;a.download=`jbcs-${report.slug}-report.csv`;a.click();URL.revokeObjectURL(url);
  }

  const currentIcon = report.icon;
  const Icon = currentIcon;
  return <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
      <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain"/></span><span><span className="block font-bold tracking-wide">JOHDEN</span><span className="mt-0.5 block text-xs text-slate-500">Business Consultancy & Finance</span></span></Link>
      <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Finance & Billing</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">{[{label:"Overview",href:"/workspace/finance",icon:FileBarChart},{label:"Invoices",href:"/workspace/finance/invoices",icon:FileText},{label:"Quotations",href:"/workspace/finance/quotes",icon:FileText},{label:"Payments & Receipts",href:"/workspace/finance/payments",icon:Receipt},{label:"Expenses",href:"/workspace/finance/expenses",icon:Wallet},{label:"Supplier Payments",href:"/workspace/finance/supplier-payments",icon:CreditCard},{label:"Owner Income & Commissions",href:"/workspace/finance/owner-income",icon:Wallet},{label:"Customers",href:"/workspace/finance/customers",icon:UsersRound},{label:"Products & Services",href:"/workspace/finance/items",icon:FileText},{label:"Reports",href:"/workspace/finance/reports",icon:FileBarChart}].map(n=><Link key={n.href} href={n.href} className={n.href==="/workspace/finance/reports"?"flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-3 text-sm font-semibold text-[#F3192D]":"flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"}><n.icon size={18}/>{n.label}</Link>)}<div className="ml-5 border-l border-slate-200 pl-3">{reportOptions.map(o=><Link key={o.slug} href={`/workspace/finance/reports/${o.slug}`} className={o.slug===report.slug?"block rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-[#F3192D]":"block rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"}>{o.title}</Link>)}</div></nav>
    </aside>
    <main className="min-h-screen px-4 pb-10 pt-5 md:ml-[264px] md:px-8">
      <div className="mb-6 flex items-center justify-between gap-3"><Link href="/workspace/finance/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#F3192D]"><ArrowLeft size={17}/> Reports & Analytics</Link><button type="button" onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"><Download size={16}/> Export CSV</button></div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">JOHDEN BUSINESS SUITE / REPORTS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{report.title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">{report.description}</p></div><div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span className="block font-bold uppercase tracking-wide text-slate-400">Data source</span><span className="mt-1 block font-semibold text-slate-700">{report.source}</span></div></header>
      <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="text-xs font-semibold text-slate-500">From<input type="date" value={start} onChange={e=>setStart(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"/></label><label className="text-xs font-semibold text-slate-500">To<input type="date" value={end} onChange={e=>setEnd(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"/></label>{report.slug==="customer-statements"&&<label className="min-w-[240px] flex-1 text-xs font-semibold text-slate-500">Customer<select value={customerId} onChange={e=>setCustomerId(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"><option value="">Choose a customer…</option>{customers.map(c=><option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}</select></label>}<span className="ml-auto text-xs text-slate-400">Only records within the selected dates are included.</span></section>
      {error&&<div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      {loading?<div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading report data…</div>:<>
        <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(report.slug==="sales"?[["Sales invoiced",money(totalInvoiced)],["Direct receipts",money(totalDirectSales)],["Customer collections",money(totalCollections)],["Outstanding invoices",money(outstanding)]]:report.slug==="expenses"?[["Total expenses",money(totalExpenses)],["Expense records",String(periodExpenses.length)],["Categories",String(expenseCategories.length)],["Supplier payments",money(totalSupplierPaid)]]:report.slug==="supplier-payments"?[["Supplier payments",money(totalSupplierPaid)],["Transactions",String(periodSupplierPayments.length)],["Linked expenses",String(periodSupplierPayments.filter(p=>p.expense_id).length)],["Standalone payments",String(periodSupplierPayments.filter(p=>!p.expense_id).length)]]:report.slug==="owner-income"?[["Received",money(totalOwnerReceived)],["Payment transactions",String(periodOwnerPayments.length)],["Income entries",String(ownerEntries.length)],["Outstanding entries",String(ownerEntries.filter(e=>Number(e.amount)>Number(e.amount_received)).length)]]:report.slug==="customer-statements"?[["Customer",customer?.name||"Not selected"],["Invoices",String(customerInvoices.length)],["Payments",money(customerPayments.reduce((n,p)=>n+amountOf(p),0))],["Outstanding",money(statementBalance)]]:report.slug==="profit-loss"?[["Sales revenue",money(totalInvoiced+totalDirectSales)],["Recorded expenses",money(totalExpenses)],["Net before other adjustments",money(totalInvoiced+totalDirectSales-totalExpenses)],["Expense records",String(periodExpenses.length)]]:[["Invoice receivables",money(outstanding)],["Cash collections",money(totalCollections)],["Supplier payments",money(totalSupplierPaid)],["Owner income received",money(totalOwnerReceived)]]).map(([title,value])=><article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-3 break-words text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">Source: {report.source}</p></article>)}
        {report.slug==="expenses"&&<section className="mb-5 grid gap-5 xl:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Expense mix</h2><p className="mt-1 text-xs text-slate-500">Source: expense records grouped by category.</p><ExpensePie categories={expenseCategories} total={totalExpenses}/></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Expense totals by category</h2><p className="mt-1 text-xs text-slate-500">Source: expense records, filtered by date.</p><DataTable rows={expenseCategories.map(([category,value])=>({category,amount:value,currency:"UGX"}))} columns={[["category","Category"],["amount","Amount"]]}/></article></section>}
        {report.slug==="customer-statements"&&(!customerId?<div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Choose a customer to view their statement.</div>:<section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">{customer?.name} — account statement</h2><p className="mt-1 text-xs text-slate-500">Source: invoices and customer payments linked to this customer. Only invoices in the selected date range are shown.</p><DataTable rows={[...customerInvoices.map(i=>({...i,__type:"Invoice"})),...customerPayments.map(p=>({...p,__type:"Payment"}))].sort((a,b)=>dateOf(a).localeCompare(dateOf(b)))} columns={[["__type","Type"],["invoice_number","Invoice / reference"],["payment_date","Payment date"],["issue_date","Invoice date"],["amount","Amount"],["status","Status"]]} /></section>)}
        {report.slug==="profit-loss"&&<section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Management Profit & Loss</h2><p className="mt-1 text-xs text-slate-500">Source: invoice totals and direct sales receipts less recorded expense entries. This is not a full general-ledger statement.</p><DataTable rows={[{label:"Invoice revenue",amount:totalInvoiced},{label:"Direct sales receipts",amount:totalDirectSales},{label:"Total revenue",amount:totalInvoiced+totalDirectSales},{label:"Recorded expenses",amount:-totalExpenses},{label:"Net before other adjustments",amount:totalInvoiced+totalDirectSales-totalExpenses}]} columns={[["label","Measure"],["amount","Amount (UGX)"]]} /></section>}
        {report.slug==="balance-sheet"&&<section className="mb-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Balance Sheet — reconciliation required</h2><p className="mt-2 text-sm text-amber-800">The available finance records do not yet provide a reconciled general ledger for cash/bank, fixed assets, taxes, liabilities and owner equity. The figures below are sourced indicators only and must not be presented as a complete statutory balance sheet.</p><DataTable rows={[{label:"Estimated invoice receivables",amount:outstanding},{label:"Customer collections in period",amount:totalCollections},{label:"Supplier payments in period",amount:totalSupplierPaid},{label:"Owner income received in period",amount:totalOwnerReceived}]} columns={[["label","Available measure"],["amount","Amount (UGX)"]]} /></section>}
        {["sales","expenses","supplier-payments","owner-income"].includes(report.slug)&&<section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">{report.title} register</h2><p className="mt-1 text-xs text-slate-500">Source: {report.source}. Select Export CSV to download the currently displayed report data.</p></div><span className="rounded-xl bg-rose-50 p-2.5 text-[#F3192D]"><Icon size={20}/></span></div><DataTable rows={rows} columns={report.slug==="sales"?[["__kind","Type"],["invoice_number","Invoice"],["receipt_number","Receipt"],["contact_name","Customer"],["issue_date","Date"],["sale_date","Sale date"],["amount","Amount"],["status","Status"]]:report.slug==="expenses"?[["expense_date","Date"],["category","Category"],["description","Description"],["supplier_name","Supplier"],["amount","Amount"],["currency","Currency"]]:report.slug==="supplier-payments"?[["payment_date","Date"],["supplier_name","Supplier"],["expense_description","Expense"],["invoice_number","Invoice / job"],["amount","Amount"],["currency","Currency"],["payment_method","Method"]]:[["payment_date","Payment date"],["__entry","Income / commission"],["amount","Amount"],["currency","Currency"],["payment_method","Method"],["payment_reference","Reference"]]} /></section>}
      </>}
    </main>
  </div>;
}

function DataTable({rows,columns}:{rows:Row[];columns:[string,string][]}) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key,label])=><th key={key} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length?rows.map((row,i)=><tr key={String(row.id||i)}>{columns.map(([key])=><td key={key} className="px-4 py-3 text-slate-700">{key==="amount"?money(amountOf(row),String(row.currency||"UGX")):key==="payment_date"||key==="issue_date"||key==="expense_date"||key==="sale_date"?dateLabel(String(row[key]||"")):key==="__entry"?textOf((row.__entry||{}) as Row,"category","description","payer"):key==="__kind"||key==="__type"?String(row[key]||"—"):String(row[key]??"—")}</td>)}</tr>):<tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">No records found for this report and date range.</td></tr>}</tbody></table></div>;
}


function ExpensePie({categories,total}:{categories:[string,number][];total:number}) {
  const colors = ["#F3192D","#F59E0B","#10B981","#6366F1","#0EA5E9","#A855F7"];
  let accumulated = 0;
  const stops = categories.map(([name,value],i) => {
    const from = accumulated;
    accumulated += total > 0 ? value / total * 100 : 0;
    return `${colors[i % colors.length]} ${from}% ${accumulated}%`;
  });
  const background = stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e2e8f0 0% 100%)";
  return <div className="mt-5 flex flex-wrap items-center gap-5"><div className="h-40 w-40 shrink-0 rounded-full" style={{background}}/><div className="min-w-[160px] flex-1 space-y-2">{categories.map(([name,value],i)=><div key={name} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{background:colors[i%colors.length]}}/>{name}</span><strong>{total?(value/total*100).toFixed(1):"0.0"}%</strong></div>)}</div></div>;
}
