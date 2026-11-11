
"use client";

import FinanceSidebar from "@/components/finance/FinanceSidebar";

import "../finance.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  CalendarDays,
  ChartNoAxesCombined,
  CreditCard,
  FileBarChart,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Package,
  PieChart,
  Receipt,
  RefreshCw,
  Settings,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/workspace/finance", icon: LayoutDashboard },
  { label: "Customers", href: "/workspace/finance/customers", icon: UsersRound },
  { label: "Products & Services", href: "/workspace/finance/items", icon: Package },
  { label: "Invoices", href: "/workspace/finance/invoices", icon: FileText },
  { label: "Quotes", href: "/workspace/finance/quotes", icon: FilePlus2 },
  { label: "Sales Receipts", href: "/workspace/finance/sales-receipts", icon: Receipt },
  { label: "Payments", href: "/workspace/finance/payments", icon: CreditCard },
  { label: "Expenses", href: "/workspace/finance/expenses", icon: Wallet },
  { label: "Supplier Payments", href: "/workspace/finance/supplier-payments", icon: CreditCard },
  { label: "Owner's Income & Commissions", href: "/workspace/finance/owner-income", icon: Wallet },
  { label: "Reports", href: "/workspace/finance/reports", icon: FileBarChart },
  { label: "Settings", href: "/workspace/settings", icon: Settings },
];

function Sidebar() {
  return <FinanceSidebar activeHref="/workspace/finance/reports" />;
}

type Row = Record<string, unknown> & {
  id?: string;
  created_at?: string;
  currency?: string;
  status?: string;
};

// Prefer the original invoice/receipt total. amount_due is a remaining balance,
// so it must not be used as the revenue total when both fields are present.
const amount = (r: Row) =>
  Number(
    r.total_amount ??
      r.total ??
      r.amount ??
      r.paid_amount ??
      r.amount_due ??
      0
  ) || 0;

const dateOf = (r: Row, fallback = "") =>
  String(
    r.issue_date ??
      r.payment_date ??
      r.expense_date ??
      r.sale_date ??
      r.date ??
      r.created_at ??
      fallback
  ).slice(0, 10);

const money = (value: number, currency = "UGX") =>
  `${currency} ${Math.round(value).toLocaleString("en-UG")}`;

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const labelDate = (value: string) => {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-UG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const normal = (value: unknown) =>
  String(value ?? "unknown").toLowerCase().replace(/[_-]+/g, " ");

const paidStatus = (r: Row) =>
  ["paid", "completed", "complete"].includes(normal(r.status));

function Metric({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <article className="finance-metric-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`rounded-xl p-3 ${tone}`}>
          <Icon size={21} />
        </span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{detail}</p>
    </article>
  );
}


const REPORT_CHART_COLORS = ["#F3192D", "#F58220", "#15803D", "#1D4ED8", "#69666B", "#B91C1C"];

function AnimatedDonut({ data, total }: { data: [string, number][]; total: number }) {
  const sorted = data.filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const visible: [string, number][] = sorted.length > 6 ? [...sorted.slice(0, 5), ["Other categories", sorted.slice(5).reduce((sum, [, value]) => sum + value, 0)]] : sorted;
  if (!visible.length || total <= 0) {
    return <div className="flex min-h-52 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No category data for this period.</div>;
  }
  let offset = 0;
  const segments = visible.map(([name, value], index) => {
    const percentage = (value / total) * 100;
    const segment = { name, value, percentage, offset, color: REPORT_CHART_COLORS[index % REPORT_CHART_COLORS.length] };
    offset += percentage;
    return segment;
  });
  return <div className="grid items-center gap-5 sm:grid-cols-[minmax(150px,.8fr)_1fr]">
    <div className="report-donut-wrap">
      <svg viewBox="0 0 42 42" className="report-donut" role="img" aria-label="Expense category distribution">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="6" />
        {segments.map((segment) => <circle key={segment.name} className="report-donut-segment" cx="21" cy="21" r="15.915" fill="none" stroke={segment.color} strokeWidth="6" pathLength="100" strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`} strokeDashoffset={-segment.offset} style={{ animationDelay: `${segments.indexOf(segment) * 120}ms` }} />)}
        <text x="21" y="20" textAnchor="middle" className="report-donut-total">{segments.length}</text>
        <text x="21" y="24.5" textAnchor="middle" className="report-donut-caption">categories</text>
      </svg>
    </div>
    <div className="space-y-3">{segments.map((segment) => <div key={segment.name} className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-600">{segment.name}</span>
      <span className="text-right text-xs font-semibold tabular-nums text-slate-900">{segment.percentage.toFixed(1)}%</span>
    </div>)}</div>
  </div>;
}

export default function FinanceReportsPage() {
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Row[]>([]);
  const [ownerIncomePayments, setOwnerIncomePayments] = useState<Row[]>([]);
  const [directSalesReceipts, setDirectSalesReceipts] = useState<Row[]>([]);

  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return localDate(date);
  });

  const [end, setEnd] = useState(() => localDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [planLocked, setPlanLocked] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const planResponse = await fetch("/api/saas/plan", { cache: "no-store" });
      const planData = await planResponse.json();
      if (!planResponse.ok) throw new Error(planData.error || "Could not verify your subscription plan.");
      if (planData.plan?.key === "basic" && !planData.plan?.isSuperAdmin) {
        setPlanLocked(true);
        return;
      }
      setPlanLocked(false);
      const [invoiceResponse, paymentResponse, expenseResponse, supplierResponse, ownerIncomeResponse, directSalesResponse] =
        await Promise.all([
          fetch("/api/saas/invoices", { cache: "no-store" }),
          fetch("/api/saas/payments", { cache: "no-store" }),
          fetch("/api/saas/expenses", { cache: "no-store" }),
          fetch("/api/saas/supplier-payments", { cache: "no-store" }),
          fetch("/api/saas/owner-income", { cache: "no-store" }),
          fetch("/api/saas/sales-receipts", { cache: "no-store" }),
        ]);

      const [invoiceData, paymentData, expenseData, supplierData, ownerIncomeData, directSalesData] = await Promise.all([
        invoiceResponse.json(),
        paymentResponse.json(),
        expenseResponse.json(),
        supplierResponse.json(),
        ownerIncomeResponse.json(),
        directSalesResponse.json(),
      ]);

      const failures = [
        !invoiceResponse.ok && (invoiceData.error || "Invoices could not be loaded."),
        !paymentResponse.ok && (paymentData.error || "Customer payments could not be loaded."),
        !expenseResponse.ok && (expenseData.error || "Expenses could not be loaded."),
        !supplierResponse.ok &&
          (supplierData.error || "Supplier payments could not be loaded."),
        !ownerIncomeResponse.ok &&
          (ownerIncomeData.error || "Owner income and commission payments could not be loaded."),
        !directSalesResponse.ok &&
          (directSalesData.error || "Direct sales receipts could not be loaded."),
        supplierData.migration_required &&
          "Supplier payment records could not be loaded. Check the supplier payments database setup.",
      ].filter(Boolean);

      if (failures.length) throw new Error(failures.join(" · "));

      setInvoices(Array.isArray(invoiceData.invoices) ? invoiceData.invoices : []);
      setPayments(Array.isArray(paymentData.payments) ? paymentData.payments : []);
      setExpenses(Array.isArray(expenseData.expenses) ? expenseData.expenses : []);
      setSupplierPayments(
        Array.isArray(supplierData.payments) ? supplierData.payments : []
      );
      setOwnerIncomePayments(
        Array.isArray(ownerIncomeData.payments) ? ownerIncomeData.payments : []
      );
      setDirectSalesReceipts(
        Array.isArray(directSalesData.receipts) ? directSalesData.receipts : []
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to load financial reports."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inRange = (r: Row) => {
    const date = dateOf(r);
    return !!date && (!start || date >= start) && (!end || date <= end);
  };

  const invalidRange = Boolean(start && end && start > end);

  const reportInvoices = useMemo(
    () => (invalidRange ? [] : invoices.filter(inRange)),
    [invoices, start, end, invalidRange]
  );

  const reportPayments = useMemo(
    () => (invalidRange ? [] : payments.filter(inRange)),
    [payments, start, end, invalidRange]
  );

  const reportExpenses = useMemo(
    () => (invalidRange ? [] : expenses.filter(inRange)),
    [expenses, start, end, invalidRange]
  );

  const reportSupplierPayments = useMemo(
    () => (invalidRange ? [] : supplierPayments.filter(inRange)),
    [supplierPayments, start, end, invalidRange]
  );

  const reportOwnerIncomePayments = useMemo(
    () => (invalidRange ? [] : ownerIncomePayments.filter(inRange)),
    [ownerIncomePayments, start, end, invalidRange]
  );

  const reportDirectSalesReceipts = useMemo(
    () => (invalidRange ? [] : directSalesReceipts.filter(inRange)),
    [directSalesReceipts, start, end, invalidRange]
  );

  const ownerIncomeReceived = reportOwnerIncomePayments.reduce((sum, row) => sum + amount(row), 0);

  // Management P&L uses issued invoice totals and recorded expenses in the selected period.
  // It is not a full general-ledger statement and intentionally excludes owner income.
  const profitLossByCurrency = useMemo(() => {
    const totals = new Map<string, { currency: string; revenue: number; expenses: number }>();
    const ensure = (currency: string) => {
      const key = currency.toUpperCase();
      const current = totals.get(key) ?? { currency: key, revenue: 0, expenses: 0 };
      totals.set(key, current);
      return current;
    };
    reportInvoices.forEach((row) => {
      const currency = String(row.currency ?? "UGX").toUpperCase();
      const revenue = Number(row.total ?? row.total_amount ?? row.subtotal ?? 0) || 0;
      ensure(currency).revenue += revenue;
    });
    reportDirectSalesReceipts.forEach((row) => {
      const currency = String(row.currency ?? "UGX").toUpperCase();
      ensure(currency).revenue += Number(row.total ?? 0) || 0;
    });
    reportExpenses.forEach((row) => {
      const currency = String(row.currency ?? "UGX").toUpperCase();
      ensure(currency).expenses += amount(row);
    });
    return [...totals.values()].map((row) => ({ ...row, operatingResult: row.revenue - row.expenses }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [reportInvoices, reportDirectSalesReceipts, reportExpenses]);

  const formatCurrencyTotals = (rows: Row[]) => {
    const totals = new Map<string, number>();
    rows.forEach((row) => {
      const currency = String(row.currency ?? "UGX").toUpperCase();
      totals.set(currency, (totals.get(currency) ?? 0) + amount(row));
    });
    return [...totals.entries()].map(([currency, total]) => money(total, currency)).join(" · ") || money(0);
  };

  const dailyOwnerIncome = useMemo(() => {
    const totals = new Map<string, { date: string; currency: string; total: number; count: number }>();
    reportOwnerIncomePayments.forEach((row) => {
      const date = dateOf(row);
      const currency = String(row.currency ?? "UGX").toUpperCase();
      if (!date) return;
      const key = `${date}|${currency}`;
      const current = totals.get(key) ?? { date, currency, total: 0, count: 0 };
      current.total += amount(row); current.count += 1; totals.set(key, current);
    });
    return [...totals.values()].sort((a, b) => b.date.localeCompare(a.date) || a.currency.localeCompare(b.currency));
  }, [reportOwnerIncomePayments]);

  const monthlyOwnerIncome = useMemo(() => {
    const totals = new Map<string, { month: string; currency: string; total: number; count: number }>();
    reportOwnerIncomePayments.forEach((row) => {
      const date = dateOf(row);
      const currency = String(row.currency ?? "UGX").toUpperCase();
      if (!date) return;
      const month = date.slice(0, 7); const key = `${month}|${currency}`;
      const current = totals.get(key) ?? { month, currency, total: 0, count: 0 };
      current.total += amount(row); current.count += 1; totals.set(key, current);
    });
    return [...totals.values()].sort((a, b) => b.month.localeCompare(a.month) || a.currency.localeCompare(b.currency));
  }, [reportOwnerIncomePayments]);

  const invoiced = reportInvoices.reduce((sum, row) => sum + amount(row), 0);
  const collected = reportPayments.reduce((sum, row) => sum + amount(row), 0);
  const spent = reportExpenses.reduce((sum, row) => sum + amount(row), 0);

  // Supplier payments are cash outflows, not additional expense records.
  // Keep them separate so an expense linked to a supplier payment is not
  // added to the expense total a second time.
  const supplierPaid = reportSupplierPayments.reduce(
    (sum, row) => sum + amount(row),
    0
  );

  const outstandingByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    reportInvoices
      .filter((row) => !paidStatus(row))
      .forEach((row) => {
        const currency = String(row.currency ?? "UGX").toUpperCase();
        const due = Math.max(
          0,
          Number(row.amount_due ?? (amount(row) - Number(row.amount_paid ?? 0))) || 0
        );
        totals.set(currency, (totals.get(currency) ?? 0) + due);
      });
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, total]) => money(total, currency))
      .join(" · ") || money(0);
  }, [reportInvoices]);

  const categories = useMemo(() => {
    const sums = new Map<string, number>();

    reportExpenses.forEach((row) => {
      const category = String(row.category ?? "Uncategorised");
      sums.set(category, (sums.get(category) ?? 0) + amount(row));
    });

    return [...sums.entries()].sort((a, b) => b[1] - a[1]);
  }, [reportExpenses]);

  function exportCsv() {
    const rows = [
      [
        "Report Type",
        "Date",
        "Reference",
        "Supplier / Customer / Description",
        "Linked Expense",
        "Linked Invoice",
        "Status",
        "Currency",
        "Amount",
      ],

      ...reportInvoices.map((row) => [
        "Invoice",
        dateOf(row),
        String(row.invoice_number ?? row.invoice_no ?? row.id ?? ""),
        String(row.customer_name ?? (typeof row.customer === "string" ? row.customer : "")),
        "",
        "",
        String(row.status ?? ""),
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),

      ...reportDirectSalesReceipts.map((row) => [
        "Direct Sales Receipt",
        dateOf(row),
        String(row.receipt_number ?? row.receipt_no ?? row.reference ?? row.id ?? ""),
        String(row.customer_name ?? row.customer ?? row.description ?? "Direct sale"),
        "",
        "",
        String(row.status ?? "recorded"),
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),

      ...reportPayments.map((row) => [
        "Customer Payment",
        dateOf(row),
        String(row.reference ?? row.payment_reference ?? row.id ?? ""),
        String(row.customer_name ?? row.description ?? ""),
        "",
        "",
        String(row.status ?? ""),
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),

      ...reportExpenses.map((row) => [
        "Expense",
        dateOf(row),
        String(row.id ?? ""),
        String(row.description ?? row.category ?? ""),
        "",
        "",
        String(row.status ?? ""),
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),

      ...reportOwnerIncomePayments.map((row) => [
        "Owner Income / Commission Receipt",
        dateOf(row),
        String(row.payment_reference ?? row.id ?? ""),
        String(row.entry_description ?? row.entry_category ?? row.notes ?? "Owner income / commission"),
        "",
        "",
        "received",
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),

      ...reportSupplierPayments.map((row) => [
        "Supplier Payment",
        dateOf(row),
        String(row.payment_reference ?? row.id ?? ""),
        String(row.supplier_name ?? "Supplier"),
        String(row.expense_description ?? ""),
        String(row.invoice_number ?? ""),
        String(row.status ?? "recorded"),
        String(row.currency ?? "UGX"),
        String(amount(row)),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\r\n");

    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    );

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `JBCS-financial-report-${start || "all"}-to-${end || "today"}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  if (planLocked) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
        <main className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-[#F3192D]">
            <FileBarChart size={28} />
          </div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">JBCS Business Suite</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Financial reports are part of Pro Accounting</h1>
          <p className="mt-4 leading-7 text-slate-600">Your Basic plan includes invoicing, sales recording, expense recording and the basic dashboard. Upgrade to the annual Pro Accounting plan to unlock financial reports, full accounting tools, supplier payment analysis and owner income reporting.</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            Your existing invoices, sales and expenses remain available on the Basic plan.
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/workspace/settings" className="rounded-xl bg-[#F3192D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c91425]">View workspace settings</Link>
            <Link href="/workspace/finance" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Return to dashboard</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="jbcs-reports-page min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <main className="min-h-screen px-4 py-5 sm:px-6 md:ml-[264px] md:px-8 md:py-8 jbcs-finance-consistent-main">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#F3192D]">
                Johden Business Suite / Finance
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                Financial reports
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Review invoices, customer collections, owner income received, expenses and supplier payments
                for your selected reporting period.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void load(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>

              <button
                onClick={exportCsv}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#c91425] disabled:opacity-60"
              >
                <ArrowDownToLine size={16} />
                Export CSV
              </button>
            </div>
          </div>

          <section className={`${panel} mb-6`}>
            <div className="mb-4">
              <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#F3192D]">Explore reports</p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Choose a financial report</h2>
              <p className="mt-1 text-sm text-slate-500">Open a focused report with its own figures, filters and export options.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { title: "Sales report", description: "Sales performance and collections", href: "/workspace/finance/reports/sales", icon: ChartNoAxesCombined, tone: "bg-rose-50 text-[#F3192D]" },
                { title: "Expense report", description: "Review recorded business spending", href: "/workspace/finance/reports/expenses", icon: Wallet, tone: "bg-amber-50 text-amber-700" },
                { title: "Supplier payments", description: "Payments made to suppliers", href: "/workspace/finance/reports/supplier-payments", icon: CreditCard, tone: "bg-slate-100 text-slate-700" },
                { title: "Owner income", description: "Owner income and commissions", href: "/workspace/finance/reports/owner-income", icon: FileBarChart, tone: "bg-violet-50 text-violet-700" },
                { title: "Customer statements", description: "Customer balances and activity", href: "/workspace/finance/reports/customer-statements", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700" },
                { title: "Profit & loss", description: "Income, expenses and net result", href: "/workspace/finance/reports/profit-loss", icon: TrendingUp, tone: "bg-sky-50 text-sky-700" },
                { title: "Balance sheet", description: "Assets, liabilities and equity", href: "/workspace/finance/reports/balance-sheet", icon: PieChart, tone: "bg-orange-50 text-orange-700" },
              ].map((report) => {
                const Icon = report.icon;
                return (
                  <Link key={report.href} href={report.href} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-rose-200 hover:bg-rose-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${report.tone}`}><Icon size={19} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{report.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{report.description}</span>
                    </span>
                    <span aria-hidden="true" className="pt-0.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#F3192D]">↗</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {invalidRange && (
            <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              The start date must be on or before the end date. Choose a valid reporting period to display results.
            </div>
          )}

          <section className={`${panel} mb-6`}>
            <div className="mb-3 flex items-center gap-2">
              <CalendarDays size={18} className="text-[#F3192D]" />
              <h2 className="font-bold">Reporting period</h2>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                From
                <input
                  type="date"
                  value={start}
                  max={end || undefined}
                  onChange={(event) => setStart(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                />
              </label>

              <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
                To
                <input
                  type="date"
                  value={end}
                  min={start || undefined}
                  onChange={(event) => setEnd(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {[
                  { label: "This month", value: "month" },
                  { label: "This year", value: "year" },
                  { label: "All time", value: "all" },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() => {
                      const now = new Date();

                      if (period.value === "month") {
                        setStart(
                          localDate(new Date(now.getFullYear(), now.getMonth(), 1))
                        );
                        setEnd(localDate(now));
                      } else if (period.value === "year") {
                        setStart(`${now.getFullYear()}-01-01`);
                        setEnd(localDate(now));
                      } else {
                        setStart("");
                        setEnd("");
                      }
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-[#F3192D]"
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
            >
              <strong>Some report data could not be loaded.</strong>
              <p className="mt-1">{error}</p>
              <p className="mt-1 text-xs">
                Check the finance API access and refresh. Totals may be incomplete
                until all records load.
              </p>
            </div>
          )}

          {loading ? (
            <div className={`${panel} py-16 text-center text-sm text-slate-500`}>
              Loading financial reports…
            </div>
          ) : (
            <>
              <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric
                  title="Invoiced"
                  value={formatCurrencyTotals(reportInvoices)}
                  detail={`${reportInvoices.length} invoice record(s) in period`}
                  icon={FileText}
                  tone="bg-rose-50 text-[#F3192D]"
                />

                <Metric
                  title="Payments received"
                  value={formatCurrencyTotals(reportPayments)}
                  detail={`${reportPayments.length} customer payment record(s)`}
                  icon={TrendingUp}
                  tone="bg-emerald-50 text-emerald-700"
                />

                <Metric
                  title="Expenses recorded"
                  value={formatCurrencyTotals(reportExpenses)}
                  detail={`${reportExpenses.length} expense record(s); supplier payments are shown separately`}
                  icon={TrendingDown}
                  tone="bg-amber-50 text-amber-700"
                />

                <Metric
                  title="Outstanding invoices"
                  value={outstandingByCurrency}
                  detail="Estimated unpaid balance of invoices in the selected period"
                  icon={Activity}
                  tone="bg-violet-50 text-violet-700"
                />
              </section>

              <section className={`${panel} mb-6`}>
                <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9f1d35]">Financial summary</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Financial performance</h2><p className="mt-1 text-sm text-slate-500">Key figures for the selected reporting period.</p></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Measure</th><th className="p-3 text-right">Amount</th><th className="p-3">Source</th></tr></thead><tbody><tr className="border-t border-slate-100"><th className="p-3 font-medium">Invoiced sales</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportInvoices)}</td><td className="p-3"><Link href="/workspace/finance/invoices" className="text-[#F3192D] hover:underline">Invoices</Link></td></tr><tr className="border-t border-slate-100"><th className="p-3 font-medium">Customer collections</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportPayments)}</td><td className="p-3"><Link href="/workspace/finance/payments" className="text-[#F3192D] hover:underline">Payments and direct sales receipts</Link></td></tr><tr className="border-t border-slate-100"><th className="p-3 font-medium">Expenses recorded</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportExpenses)}</td><td className="p-3"><Link href="/workspace/finance/expenses" className="text-[#F3192D] hover:underline">Expenses</Link></td></tr><tr className="border-t border-slate-100"><th className="p-3 font-medium">Supplier payments</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportSupplierPayments)}</td><td className="p-3"><Link href="/workspace/finance/supplier-payments" className="text-[#F3192D] hover:underline">Supplier payments</Link></td></tr></tbody></table></div>
                <p className="mt-4 text-xs text-slate-400">Source: records returned by the linked finance modules and filtered by the reporting dates above. Supplier payments are shown separately and are not counted again as expenses. Amounts across multiple currencies should not be treated as a single converted total.</p>
              </section>

              <section className="mb-6 grid gap-5 xl:grid-cols-2">
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold">Expense mix</h2><p className="mt-1 text-sm text-slate-500">Pie chart of recorded expenses by category.</p></div>
                    <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><PieChart size={20} /></span>
                  </div>
                  <AnimatedDonut data={categories} total={spent} />
                  <p className="mt-4 text-xs text-slate-400">Source: expense records grouped by category and filtered by the selected reporting dates. Supplier payments remain separate to avoid double-counting.</p><Link href="/workspace/finance/expenses" className="mt-3 inline-block text-sm font-semibold text-[#F3192D] hover:underline">Open expense records</Link>
                </article>
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold">Cash movement</h2><p className="mt-1 text-sm text-slate-500">Pie chart comparing customer collections with supplier payments for the selected dates.</p></div>
                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><PieChart size={20} /></span>
                  </div>
                  <AnimatedDonut data={[["Customer collections", collected], ["Supplier payments", supplierPaid]]} total={collected + supplierPaid} />
                  <p className="mt-4 text-xs text-slate-400">Source: customer payment records plus direct sales receipts for collections; supplier payment records for supplier outflows. The reporting-period filter above applies. Supplier payments are not added to expense totals.</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <Link href="/workspace/finance/payments" className="font-semibold text-[#F3192D] hover:underline">View customer payments</Link>
                    <Link href="/workspace/finance/supplier-payments" className="font-semibold text-[#F3192D] hover:underline">View supplier payments</Link>
                  </div>
                </article>
              </section>

              <section className="mb-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Expense breakdown</h2><p className="mt-1 text-sm text-slate-500">Recorded spending by category for the selected period.</p></div><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><FileBarChart size={20} /></span></div>
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3">Expense category</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Share</th></tr></thead><tbody>{categories.map(([name, value]) => <tr key={name} className="border-t border-slate-100"><td className="p-3">{name}</td><td className="p-3 text-right font-semibold tabular-nums">{money(value)}</td><td className="p-3 text-right tabular-nums">{spent > 0 ? ((value / spent) * 100).toFixed(1) : "0.0"}%</td></tr>)}{!categories.length && <tr><td colSpan={3} className="p-4 text-center text-slate-500">No expense records found for this period.</td></tr>}</tbody><tfoot className="border-t-2 border-slate-200 bg-slate-50"><tr><th className="p-3 text-left">Total recorded expenses</th><th className="p-3 text-right">{formatCurrencyTotals(reportExpenses)}</th><th className="p-3 text-right">100%</th></tr></tfoot></table></div>
                  <p className="mt-4 text-xs leading-5 text-slate-400">Source: expense records grouped by category and filtered by the reporting period. Supplier payments are not added to these totals.</p><Link href="/workspace/finance/expenses" className="mt-3 inline-block text-sm font-semibold text-[#F3192D] hover:underline">View expense records</Link>
                </article>

                <article className={panel}>
                  <div className="mb-5"><h2 className="text-lg font-bold">Financial position</h2><p className="mt-1 text-sm text-slate-500">Cash movement summary for the selected period.</p></div>
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody><tr className="border-b border-slate-100"><th className="p-3 font-medium text-slate-600">Customer collections</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportPayments)}</td></tr><tr className="border-b border-slate-100"><th className="p-3 font-medium text-slate-600">Supplier payments</th><td className="p-3 text-right font-bold">{formatCurrencyTotals(reportSupplierPayments)}</td></tr><tr className="border-b border-slate-100"><th className="p-3 font-medium text-slate-600">Net customer-to-supplier movement</th><td className={`p-3 text-right text-lg font-bold ${collected-supplierPaid>=0?"text-emerald-700":"text-rose-700"}`}>{money(collected-supplierPaid)}</td></tr></tbody></table></div>
                  <p className="mt-4 text-xs leading-5 text-slate-400">Source: customer payment records and direct sales receipts less supplier payment records. This is a cash-movement summary, not a complete balance sheet; other expenses, transfers, tax, assets and liabilities are not included.</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><Link href="/workspace/finance/payments" className="font-semibold text-[#F3192D] hover:underline">Customer payments</Link><Link href="/workspace/finance/supplier-payments" className="font-semibold text-[#F3192D] hover:underline">Supplier payments</Link></div>
                </article>
              </section>

              <section className={`${panel} mb-6`}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Owner income received by day and month</h2>
                  <p className="mt-1 text-sm text-slate-500">Source: actual owner income and commission payment transactions, grouped by payment date and currency. Partial payments are included; only payments within the selected reporting period are included.</p><Link href="/workspace/finance/owner-income" className="mt-2 inline-block text-sm font-semibold text-[#F3192D] hover:underline">Open owner income records</Link>
                </div>
                <div className="grid gap-5 xl:grid-cols-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold">Daily receipts</h3>
                    <table className="w-full min-w-[390px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Payments</th></tr></thead><tbody className="divide-y divide-slate-100">{dailyOwnerIncome.map((row) => <tr key={`${row.date}-${row.currency}`}><td className="px-4 py-3">{labelDate(row.date)}</td><td className="px-4 py-3">{row.currency}</td><td className="px-4 py-3 font-semibold">{money(row.total, row.currency)}</td><td className="px-4 py-3">{row.count}</td></tr>)}</tbody></table>
                    {!dailyOwnerIncome.length && <p className="p-5 text-sm text-slate-500">No owner income receipts in this period.</p>}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold">Month-end receipts</h3>
                    <table className="w-full min-w-[390px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Month</th><th className="px-4 py-3">Currency</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Payments</th></tr></thead><tbody className="divide-y divide-slate-100">{monthlyOwnerIncome.map((row) => <tr key={`${row.month}-${row.currency}`}><td className="px-4 py-3">{row.month}</td><td className="px-4 py-3">{row.currency}</td><td className="px-4 py-3 font-semibold">{money(row.total, row.currency)}</td><td className="px-4 py-3">{row.count}</td></tr>)}</tbody></table>
                    {!monthlyOwnerIncome.length && <p className="p-5 text-sm text-slate-500">No owner income receipts in this period.</p>}
                  </div>
                </div>
              </section>

              <section className={`${panel} mb-6`}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Management Statement of Profit and Loss</h2>
                  <p className="mt-1 text-sm text-slate-500">Source: invoice totals and standalone direct sales receipts, less expense records in the selected period, grouped by currency. Supplier payments are not subtracted again as expenses.</p><div className="mt-2 flex flex-wrap gap-3 text-sm"><Link href="/workspace/finance/invoices" className="font-semibold text-[#F3192D] hover:underline">Invoices</Link><Link href="/workspace/finance/sales-receipts" className="font-semibold text-[#F3192D] hover:underline">Sales receipts</Link><Link href="/workspace/finance/expenses" className="font-semibold text-[#F3192D] hover:underline">Expenses</Link></div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Currency</th><th className="px-3 py-3 text-right">Sales revenue</th><th className="px-3 py-3 text-right">Expenses</th><th className="px-3 py-3 text-right">Operating result</th></tr></thead>
                    <tbody>{profitLossByCurrency.map((row) => <tr key={row.currency} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold">{row.currency}</td><td className="px-3 py-3 text-right">{money(row.revenue, row.currency)}</td><td className="px-3 py-3 text-right">{money(row.expenses, row.currency)}</td><td className={`px-3 py-3 text-right font-bold ${row.operatingResult < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(row.operatingResult, row.currency)}</td></tr>)}
                    {!profitLossByCurrency.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No invoice, direct sales or expense records for this period.</td></tr>}</tbody>
                  </table>
                </div>
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Management view only — not a full general-ledger P&amp;L. A complete balance sheet requires reconciled cash/bank, receivables, liabilities, assets, tax and owner-equity balances.</p>
              </section>



              <p className="text-xs leading-5 text-slate-400">
                Figures are calculated from records returned by the finance APIs and
                filtered by their record dates. Expense totals and supplier payments
                are shown separately to avoid automatically counting supplier
                payments as additional expenses. Confirm figures against your
                accounting records before using them for statutory or audited
                reporting.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
