"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileBarChart, FileText, Receipt, Wallet, UsersRound, CreditCard, TrendingUp } from "lucide-react";

type Row = Record<string, unknown> & { id?: string; currency?: string; status?: string };
type Customer = Row & { name?: string; email?: string; phone?: string };
type Column = [string, string];

const reportOptions = [
  { slug: "sales", title: "Sales Report", description: "Sales by invoice and standalone sales receipt.", source: "Invoices and direct sales receipts" },
  { slug: "expenses", title: "Expense Report", description: "Recorded expenses by category, date and supplier.", source: "Expense records" },
  { slug: "supplier-payments", title: "Supplier Payments", description: "Supplier disbursements and payment history.", source: "Supplier payment records" },
  { slug: "owner-income", title: "Owner Income & Commissions", description: "Payments received against owner-income and commission entries.", source: "Owner-income entries and payment transactions" },
  { slug: "customer-statements", title: "Customer Statements", description: "Customer invoices, payments and outstanding balances.", source: "Customer, invoice and payment records" },
  { slug: "profit-loss", title: "Profit & Loss", description: "Management view of sales and recorded expenses.", source: "Invoices, direct sales receipts and expenses" },
  { slug: "balance-sheet", title: "Balance Sheet", description: "Review available financial position data and reconciliation gaps.", source: "Available finance records; not a reconciled general ledger" },
];

const amountOf = (r: Row) => Number(r.total_amount ?? r.total ?? r.amount ?? r.paid_amount ?? r.amount_due ?? 0) || 0;
const dateOf = (r: Row) => String(r.issue_date ?? r.payment_date ?? r.expense_date ?? r.sale_date ?? r.earned_date ?? r.date ?? r.created_at ?? "").slice(0, 10);
const textOf = (r: Row, ...keys: string[]) => {
  for (const key of keys) {
    const value = r[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return "—";
};
const money = (n: number, currency = "UGX") => `${currency} ${Math.round(n).toLocaleString("en-UG")}`;
const dateLabel = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function FinanceReportDetailPage() {
  const params = useParams<{ report: string }>();
  const slug = Array.isArray(params.report) ? params.report[0] : params.report;
  const report = reportOptions.find(item => item.slug === slug) || reportOptions[0];
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Row[]>([]);
  const [ownerEntries, setOwnerEntries] = useState<Row[]>([]);
  const [ownerPayments, setOwnerPayments] = useState<Row[]>([]);
  const [salesReceipts, setSalesReceipts] = useState<Row[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const paths = [
          "/api/saas/customers", "/api/saas/invoices", "/api/saas/payments",
          "/api/saas/expenses", "/api/saas/supplier-payments",
          "/api/saas/owner-income", "/api/saas/sales-receipts",
        ];
        const responses = await Promise.all(paths.map(path => fetch(path, { cache: "no-store" })));
        const data = await Promise.all(responses.map(response => response.json()));
        const failed = responses.findIndex((response, index) => !response.ok || data[index]?.error || data[index]?.migration_required);
        if (failed >= 0) throw new Error(data[failed]?.error || `Could not load ${paths[failed].split("/").pop()} report data.`);
        if (!active) return;
        setCustomers(Array.isArray(data[0].customers) ? data[0].customers : []);
        setInvoices(Array.isArray(data[1].invoices) ? data[1].invoices : []);
        setPayments(Array.isArray(data[2].payments) ? data[2].payments : []);
        setExpenses(Array.isArray(data[3].expenses) ? data[3].expenses : []);
        setSupplierPayments(Array.isArray(data[4].payments) ? data[4].payments : []);
        setOwnerEntries(Array.isArray(data[5].entries) ? data[5].entries : []);
        setOwnerPayments(Array.isArray(data[5].payments) ? data[5].payments : []);
        setSalesReceipts(Array.isArray(data[6].receipts) ? data[6].receipts : []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load report data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const inPeriod = (row: Row) => {
    const date = dateOf(row);
    return (!start || (date !== "" && date >= start)) && (!end || (date !== "" && date <= end));
  };
  const periodInvoices = useMemo(() => invoices.filter(inPeriod), [invoices, start, end]);
  const periodPayments = useMemo(() => payments.filter(inPeriod), [payments, start, end]);
  const periodExpenses = useMemo(() => expenses.filter(inPeriod), [expenses, start, end]);
  const periodSupplierPayments = useMemo(() => supplierPayments.filter(inPeriod), [supplierPayments, start, end]);
  const periodOwnerPayments = useMemo(() => ownerPayments.filter(inPeriod), [ownerPayments, start, end]);
  const periodSalesReceipts = useMemo(() => salesReceipts.filter(inPeriod), [salesReceipts, start, end]);
  const customer = customers.find(item => String(item.id) === customerId) || null;
  const customerInvoices = periodInvoices.filter(invoice => String(invoice.contact_id ?? (invoice.business_contacts as Row | undefined)?.id ?? "") === customerId);
  const customerInvoiceIds = new Set(customerInvoices.map(invoice => String(invoice.id || "")));
  const customerPayments = periodPayments.filter(payment => customerInvoiceIds.has(String(payment.invoice_id || "")));
  const totalInvoiced = periodInvoices.reduce((sum, row) => sum + amountOf(row), 0);
  const totalDirectSales = periodSalesReceipts.reduce((sum, row) => sum + amountOf(row), 0);
  const totalExpenses = periodExpenses.reduce((sum, row) => sum + amountOf(row), 0);
  const totalCollections = periodPayments.reduce((sum, row) => sum + amountOf(row), 0) + totalDirectSales;
  const outstandingFor = (row: Row) => Math.max(0, row.amount_due !== undefined && row.amount_due !== null ? Number(row.amount_due) : amountOf(row) - Number(row.amount_paid ?? row.paid_amount ?? 0));
  const outstanding = periodInvoices.reduce((sum, row) => sum + outstandingFor(row), 0);
  const totalSupplierPaid = periodSupplierPayments.reduce((sum, row) => sum + amountOf(row), 0);
  const totalOwnerReceived = periodOwnerPayments.reduce((sum, row) => sum + amountOf(row), 0);
  const statementBalance = customerInvoices.reduce((sum, row) => sum + outstandingFor(row), 0);
  const expenseCategories = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const expense of periodExpenses) {
      const category = textOf(expense, "category", "expense_category");
      grouped.set(category, (grouped.get(category) || 0) + amountOf(expense));
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [periodExpenses]);

  const rows: Row[] = report.slug === "sales"
    ? [...periodInvoices.map(row => ({ ...row, __kind: "Invoice" })), ...periodSalesReceipts.map(row => ({ ...row, __kind: "Sales receipt" }))]
    : report.slug === "expenses" ? periodExpenses
    : report.slug === "supplier-payments" ? periodSupplierPayments
    : report.slug === "owner-income" ? periodOwnerPayments.map(payment => ({ ...payment, __entry: ownerEntries.find(entry => entry.id === payment.entry_id) }))
    : [];

  const summary: [string, string][] = report.slug === "sales"
    ? [["Sales invoiced", money(totalInvoiced)], ["Direct receipts", money(totalDirectSales)], ["Customer collections", money(totalCollections)], ["Outstanding invoices", money(outstanding)]]
    : report.slug === "expenses"
    ? [["Total expenses", money(totalExpenses)], ["Expense records", String(periodExpenses.length)], ["Categories", String(expenseCategories.length)], ["Supplier payments", money(totalSupplierPaid)]]
    : report.slug === "supplier-payments"
    ? [["Supplier payments", money(totalSupplierPaid)], ["Transactions", String(periodSupplierPayments.length)], ["Linked expenses", String(periodSupplierPayments.filter(row => row.expense_id).length)], ["Standalone payments", String(periodSupplierPayments.filter(row => !row.expense_id).length)]]
    : report.slug === "owner-income"
    ? [["Received", money(totalOwnerReceived)], ["Payment transactions", String(periodOwnerPayments.length)], ["Income entries", String(ownerEntries.length)], ["Outstanding entries", String(ownerEntries.filter(row => Number(row.amount) > Number(row.amount_received)).length)]]
    : report.slug === "customer-statements"
    ? [["Customer", customer?.name || "Not selected"], ["Invoices", String(customerInvoices.length)], ["Payments", money(customerPayments.reduce((sum, row) => sum + amountOf(row), 0))], ["Outstanding", money(statementBalance)]]
    : report.slug === "profit-loss"
    ? [["Sales revenue", money(totalInvoiced + totalDirectSales)], ["Recorded expenses", money(totalExpenses)], ["Net before other adjustments", money(totalInvoiced + totalDirectSales - totalExpenses)], ["Expense records", String(periodExpenses.length)]]
    : [["Invoice receivables", money(outstanding)], ["Cash collections", money(totalCollections)], ["Supplier payments", money(totalSupplierPaid)], ["Owner income received", money(totalOwnerReceived)]];

  const columns: Column[] = report.slug === "sales"
    ? [["__kind", "Type"], ["invoice_number", "Invoice"], ["receipt_number", "Receipt"], ["contact_name", "Customer"], ["issue_date", "Date"], ["sale_date", "Sale date"], ["amount", "Amount"], ["status", "Status"]]
    : report.slug === "expenses"
    ? [["expense_date", "Date"], ["category", "Category"], ["description", "Description"], ["supplier_name", "Supplier"], ["amount", "Amount"], ["currency", "Currency"]]
    : report.slug === "supplier-payments"
    ? [["payment_date", "Date"], ["supplier_name", "Supplier"], ["expense_description", "Expense"], ["invoice_number", "Invoice / job"], ["amount", "Amount"], ["currency", "Currency"], ["payment_method", "Method"]]
    : [["payment_date", "Payment date"], ["__entry", "Income / commission"], ["amount", "Amount"], ["currency", "Currency"], ["payment_method", "Method"], ["payment_reference", "Reference"]];

  function exportCSV() {
    const exportRows: Row[] = report.slug === "customer-statements"
      ? [...customerInvoices.map(row => ({ ...row, __kind: "Invoice" })), ...customerPayments.map(row => ({ ...row, __kind: "Payment" }))]
      : rows;
    const keys = report.slug === "customer-statements"
      ? ["__kind", "invoice_number", "payment_reference", "issue_date", "payment_date", "amount", "status"]
      : columns.map(([key]) => key);
    const csv = [keys.join(","), ...exportRows.map(row => keys.map(key => JSON.stringify(key === "__entry" ? textOf((row.__entry || {}) as Row, "category", "description", "payer") : row[key] ?? "")).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `jbcs-${report.slug}-report.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
        <Link href="/workspace/finance" className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white"><img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" /></span>
          <span><span className="block font-bold tracking-wide">JOHDEN</span><span className="mt-0.5 block text-xs text-slate-500">Business Consultancy & Finance</span></span>
        </Link>
        <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Finance & Billing</div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {[
            { label: "Overview", href: "/workspace/finance", icon: FileBarChart },
            { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
            { label: "Quotations", href: "/workspace/finance/quotes", icon: FileText },
            { label: "Payments & Receipts", href: "/workspace/finance/payments", icon: Receipt },
            { label: "Expenses", href: "/workspace/finance/expenses", icon: Wallet },
            { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: CreditCard },
            { label: "Owner Income & Commissions", href: "/workspace/finance/owner-income", icon: Wallet },
            { label: "Customers", href: "/workspace/finance/customers", icon: UsersRound },
            { label: "Products & Services", href: "/workspace/finance/items", icon: FileText },
            { label: "Reports", href: "/workspace/finance/reports", icon: FileBarChart },
          ].map(item => {
            const Icon = item.icon;
            return <Link key={item.href} href={item.href} className={item.href === "/workspace/finance/reports" ? "flex items-center gap-3 rounded-xl bg-rose-50 px-3 py-3 text-sm font-semibold text-[#F3192D]" : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"}><Icon size={18} />{item.label}</Link>;
          })}
          <div className="ml-5 border-l border-slate-200 pl-3">
            {reportOptions.map(item => <Link key={item.slug} href={`/workspace/finance/reports/${item.slug}`} className={item.slug === report.slug ? "block rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-[#F3192D]" : "block rounded-lg px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"}>{item.title}</Link>)}
          </div>
        </nav>
      </aside>

      <main className="min-h-screen px-4 pb-10 pt-5 md:ml-[264px] md:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/workspace/finance/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#F3192D]"><ArrowLeft size={17} /> Reports & Analytics</Link>
          <button type="button" onClick={exportCSV} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm"><Download size={16} /> Export CSV</button>
        </div>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">JOHDEN BUSINESS SUITE / REPORTS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{report.title}</h1><p className="mt-2 max-w-3xl text-sm text-slate-500">{report.description}</p></div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span className="block font-bold uppercase tracking-wide text-slate-400">Data source</span><span className="mt-1 block font-semibold text-slate-700">{report.source}</span></div>
        </header>
        <section className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-slate-500">From<input type="date" value={start} onChange={event => setStart(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
          <label className="text-xs font-semibold text-slate-500">To<input type="date" value={end} onChange={event => setEnd(event.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800" /></label>
          {report.slug === "customer-statements" && <label className="min-w-[240px] flex-1 text-xs font-semibold text-slate-500">Customer<select value={customerId} onChange={event => setCustomerId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"><option value="">Choose a customer…</option>{customers.map(item => <option key={String(item.id)} value={String(item.id)}>{item.name}</option>)}</select></label>}
          <span className="ml-auto text-xs text-slate-400">Only records within the selected dates are included.</span>
        </section>

        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading report data…</div> : (
          <>
            <section className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map(([title, value]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p><p className="mt-3 break-words text-xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">Source: {report.source}</p></article>)}
            </section>

            {report.slug === "expenses" && <section className="mb-5 grid gap-5 xl:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Expense mix</h2><p className="mt-1 text-xs text-slate-500">Source: expense records grouped by category.</p><ExpensePie categories={expenseCategories} total={totalExpenses} /></article><article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Expense totals by category</h2><p className="mt-1 text-xs text-slate-500">Source: expense records, filtered by date.</p><DataTable rows={expenseCategories.map(([category, value]) => ({ category, amount: value, currency: "UGX" }))} columns={[["category", "Category"], ["amount", "Amount"]]} /></article></section>}

            {report.slug === "customer-statements" && (customerId ? <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">{customer?.name} — account statement</h2><p className="mt-1 text-xs text-slate-500">Source: invoices and customer payments linked to this customer, within the selected dates.</p><DataTable rows={[...customerInvoices.map(row => ({ ...row, __kind: "Invoice" })), ...customerPayments.map(row => ({ ...row, __kind: "Payment" }))].sort((a, b) => dateOf(a).localeCompare(dateOf(b)))} columns={[["__kind", "Type"], ["invoice_number", "Invoice / reference"], ["issue_date", "Invoice date"], ["payment_date", "Payment date"], ["amount", "Amount"], ["status", "Status"]]} /></section> : <EmptyState message="Choose a customer to view their statement." />)}

            {report.slug === "profit-loss" && <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Management Profit & Loss</h2><p className="mt-1 text-xs text-slate-500">Source: invoice totals and direct sales receipts less recorded expense entries. This is not a full general-ledger statement.</p><DataTable rows={[{ label: "Invoice revenue", amount: totalInvoiced }, { label: "Direct sales receipts", amount: totalDirectSales }, { label: "Total revenue", amount: totalInvoiced + totalDirectSales }, { label: "Recorded expenses", amount: -totalExpenses }, { label: "Net before other adjustments", amount: totalInvoiced + totalDirectSales - totalExpenses }]} columns={[["label", "Measure"], ["amount", "Amount (UGX)"]]} /></section>}

            {report.slug === "balance-sheet" && <section className="mb-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"><h2 className="font-bold">Balance Sheet — reconciliation required</h2><p className="mt-2 text-sm text-amber-800">Available finance records do not yet provide a reconciled general ledger for cash/bank, fixed assets, taxes, liabilities and owner equity. These are sourced indicators only, not a complete statutory balance sheet.</p><DataTable rows={[{ label: "Estimated invoice receivables", amount: outstanding }, { label: "Customer collections in period", amount: totalCollections }, { label: "Supplier payments in period", amount: totalSupplierPaid }, { label: "Owner income received in period", amount: totalOwnerReceived }]} columns={[["label", "Available measure"], ["amount", "Amount (UGX)"]]} /></section>}

            {["sales", "expenses", "supplier-payments", "owner-income"].includes(report.slug) && <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold">{report.title} register</h2><p className="mt-1 text-xs text-slate-500">Source: {report.source}. Export CSV to download these records.</p></div><span className="rounded-xl bg-rose-50 p-2.5 text-[#F3192D]"><TrendingUp size={20} /></span></div><DataTable rows={rows} columns={columns} /></section>}
          </>
        )}
      </main>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{message}</div>;
}

function ExpensePie({ categories, total }: { categories: [string, number][]; total: number }) {
  const colors = ["#F3192D", "#F59E0B", "#10B981", "#6366F1", "#0EA5E9", "#A855F7"];
  let accumulated = 0;
  const stops = categories.map(([, value], index) => {
    const from = accumulated;
    accumulated += total > 0 ? value / total * 100 : 0;
    return `${colors[index % colors.length]} ${from}% ${accumulated}%`;
  });
  const background = stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(#e2e8f0 0% 100%)";
  return <div className="mt-5 flex flex-wrap items-center gap-5"><div className="h-40 w-40 shrink-0 rounded-full" style={{ background }} /><div className="min-w-[160px] flex-1 space-y-2">{categories.map(([name, value], index) => <div key={name} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[index % colors.length] }} />{name}</span><strong>{total ? (value / total * 100).toFixed(1) : "0.0"}%</strong></div>)}</div></div>;
}

function DataTable({ rows, columns }: { rows: Row[]; columns: Column[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map(([key, label]) => <th key={key} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.length ? rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map(([key]) => <td key={key} className="px-4 py-3 text-slate-700">{key === "amount" ? money(amountOf(row), String(row.currency || "UGX")) : key === "payment_date" || key === "issue_date" || key === "expense_date" || key === "sale_date" ? dateLabel(String(row[key] || "")) : key === "__entry" ? textOf((row.__entry || {}) as Row, "category", "description", "payer") : key === "__kind" ? String(row[key] || "—") : String(row[key] ?? "—")}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">No records found for this report and date range.</td></tr>}</tbody></table></div>;
}
