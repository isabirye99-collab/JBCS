
"use client";

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
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col border-r border-slate-200 bg-white md:flex">
        <Link
          href="/workspace/finance"
          className="flex min-h-[98px] items-center gap-3 border-b border-slate-100 px-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white">
            <img src="/johden-logo.svg" alt="Johden logo" className="h-full w-full object-contain" />
          </span>
          <span>
            <span className="block font-bold tracking-wide text-slate-900">JOHDEN</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Business Consultancy &amp; Finance
            </span>
          </span>
        </Link>

        <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">
          Workspace
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/workspace/finance/reports";

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                  active
                    ? "bg-rose-50 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50 hover:text-[#F3192D]"
                }`}
              >
                <Icon size={19} className={active ? "text-[#F3192D]" : "text-slate-700"} />
                <span className="flex-1">{item.label}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#F3192D]" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-4 py-4 text-xs text-slate-400">
          Johden Business Suite
        </div>
      </aside>

      <nav aria-label="Workspace navigation" className="mb-4 flex flex-wrap gap-2 md:hidden">
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              item.href === "/workspace/finance/reports"
                ? "border-rose-200 bg-rose-50 text-[#F3192D]"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

type Row = Record<string, unknown> & {
  id?: string;
  created_at?: string;
  currency?: string;
  status?: string;
};

const amount = (r: Row) =>
  Number(
    r.amount_due ??
      r.total_amount ??
      r.total ??
      r.amount ??
      r.paid_amount ??
      0
  ) || 0;

const dateOf = (r: Row, fallback = "") =>
  String(
    r.issue_date ??
      r.payment_date ??
      r.expense_date ??
      r.date ??
      r.created_at ??
      fallback
  ).slice(0, 10);

const money = (value: number, currency = "UGX") =>
  `${currency} ${Math.round(value).toLocaleString("en-UG")}`;

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
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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


const REPORT_CHART_COLORS = ["#9f1d35", "#f97316", "#0f766e", "#6366f1", "#0891b2", "#a855f7"];

function AnimatedDonut({ data, total }: { data: [string, number][]; total: number }) {
  const visible = data.filter(([, value]) => value > 0).slice(0, 6);
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

function AnimatedTrendChart({ data }: { data: { month: string; invoiced: number; collected: number; expenses: number }[] }) {
  const maxValue = Math.max(1, ...data.flatMap((row) => [row.invoiced, row.collected, row.expenses]));
  if (!data.length) return <div className="flex min-h-64 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No monthly activity found for this period.</div>;
  return <div>
    <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
      {[["Invoiced", "#9f1d35"], ["Collected", "#0f766e"], ["Expenses", "#f97316"]].map(([label, color]) => <span key={label} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />{label}</span>)}
    </div>
    <div className="report-chart-grid relative grid h-64 grid-cols-6 items-end gap-3 rounded-xl px-2 pb-2 pt-5 sm:gap-5">
      {data.map((row, index) => <div key={row.month} className="relative z-10 flex h-full min-w-0 flex-col justify-end">
        <div className="flex min-h-0 flex-1 items-end justify-center gap-1 sm:gap-1.5">
          {[["invoiced", "#9f1d35"], ["collected", "#0f766e"], ["expenses", "#f97316"]].map(([key, color], seriesIndex) => {
            const value = row[key as "invoiced" | "collected" | "expenses"];
            return <div key={key} className="report-animated-bar w-full max-w-5 rounded-t-md" title={`${key}: ${money(value)}`} style={{ height: `${Math.max(value > 0 ? 3 : 0, value / maxValue * 100)}%`, backgroundColor: color, animationDelay: `${index * 90 + seriesIndex * 70}ms` }} />;
          })}
        </div>
        <span className="mt-2 truncate text-center text-[10px] font-medium text-slate-500">{row.month}</span>
      </div>)}
    </div>
    <p className="mt-3 text-xs text-slate-400">Bars animate on load. Hover over a bar to inspect its recorded value.</p>
  </div>;
}

export default function FinanceReportsPage() {
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Row[]>([]);
  const [ownerIncomePayments, setOwnerIncomePayments] = useState<Row[]>([]);

  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  });

  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
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
      const [invoiceResponse, paymentResponse, expenseResponse, supplierResponse, ownerIncomeResponse] =
        await Promise.all([
          fetch("/api/saas/invoices", { cache: "no-store" }),
          fetch("/api/saas/payments", { cache: "no-store" }),
          fetch("/api/saas/expenses", { cache: "no-store" }),
          fetch("/api/saas/supplier-payments", { cache: "no-store" }),
          fetch("/api/saas/owner-income", { cache: "no-store" }),
        ]);

      const [invoiceData, paymentData, expenseData, supplierData, ownerIncomeData] = await Promise.all([
        invoiceResponse.json(),
        paymentResponse.json(),
        expenseResponse.json(),
        supplierResponse.json(),
        ownerIncomeResponse.json(),
      ]);

      const failures = [
        !invoiceResponse.ok && (invoiceData.error || "Invoices could not be loaded."),
        !paymentResponse.ok && (paymentData.error || "Customer payments could not be loaded."),
        !expenseResponse.ok && (expenseData.error || "Expenses could not be loaded."),
        !supplierResponse.ok &&
          (supplierData.error || "Supplier payments could not be loaded."),
        !ownerIncomeResponse.ok &&
          (ownerIncomeData.error || "Owner income and commission payments could not be loaded."),
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

  const reportInvoices = useMemo(
    () => invoices.filter(inRange),
    [invoices, start, end]
  );

  const reportPayments = useMemo(
    () => payments.filter(inRange),
    [payments, start, end]
  );

  const reportExpenses = useMemo(
    () => expenses.filter(inRange),
    [expenses, start, end]
  );

  const reportSupplierPayments = useMemo(
    () => supplierPayments.filter(inRange),
    [supplierPayments, start, end]
  );

  const reportOwnerIncomePayments = useMemo(
    () => ownerIncomePayments.filter(inRange),
    [ownerIncomePayments, start, end]
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
    reportExpenses.forEach((row) => {
      const currency = String(row.currency ?? "UGX").toUpperCase();
      ensure(currency).expenses += amount(row);
    });
    return [...totals.values()].map((row) => ({ ...row, operatingResult: row.revenue - row.expenses }))
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [reportInvoices, reportExpenses]);

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

  const outstanding = reportInvoices
    .filter((row) => !paidStatus(row))
    .reduce(
      (sum, row) =>
        sum +
        Math.max(
          0,
          Number(
            row.amount_due ??
              (amount(row) - Number(row.amount_paid ?? 0))
          ) || 0
        ),
      0
    );

  const categories = useMemo(() => {
    const sums = new Map<string, number>();

    reportExpenses.forEach((row) => {
      const category = String(row.category ?? "Uncategorised");
      sums.set(category, (sums.get(category) ?? 0) + amount(row));
    });

    return [...sums.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [reportExpenses]);

  const monthlyFinancialTrend = useMemo(() => {
    const totals = new Map<string, { month: string; invoiced: number; collected: number; expenses: number }>();
    const addRows = (rows: Row[], field: "invoiced" | "collected" | "expenses") => rows.forEach((row) => {
      const date = dateOf(row);
      if (!date) return;
      const month = date.slice(0, 7);
      const current = totals.get(month) ?? { month, invoiced: 0, collected: 0, expenses: 0 };
      current[field] += amount(row);
      totals.set(month, current);
    });
    addRows(reportInvoices, "invoiced");
    addRows(reportPayments, "collected");
    addRows(reportExpenses, "expenses");
    return [...totals.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-6).map((row) => ({ ...row, month: new Date(row.month + "-01T00:00:00").toLocaleDateString("en-UG", { month: "short", year: "2-digit" }) }));
  }, [reportInvoices, reportPayments, reportExpenses]);

  const recentInvoices = useMemo(
    () =>
      [...reportInvoices]
        .sort((a, b) => dateOf(b).localeCompare(dateOf(a)))
        .slice(0, 8),
    [reportInvoices]
  );

  const recentSupplierPayments = useMemo(
    () =>
      [...reportSupplierPayments]
        .sort((a, b) => dateOf(b).localeCompare(dateOf(a)))
        .slice(0, 10),
    [reportSupplierPayments]
  );

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
    URL.revokeObjectURL(url);
  }

  const panel = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const maxCashBar = Math.max(1, collected, supplierPaid);

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
                          new Date(now.getFullYear(), now.getMonth(), 1)
                            .toISOString()
                            .slice(0, 10)
                        );
                        setEnd(now.toISOString().slice(0, 10));
                      } else if (period.value === "year") {
                        setStart(`${now.getFullYear()}-01-01`);
                        setEnd(now.toISOString().slice(0, 10));
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
              <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Metric
                  title="Invoiced"
                  value={money(invoiced)}
                  detail={`${reportInvoices.length} invoice record(s) in period`}
                  icon={FileText}
                  tone="bg-rose-50 text-[#F3192D]"
                />

                <Metric
                  title="Payments received"
                  value={money(collected)}
                  detail={`${reportPayments.length} customer payment record(s)`}
                  icon={TrendingUp}
                  tone="bg-emerald-50 text-emerald-700"
                />

                <Metric
                  title="Owner income received"
                  value={formatCurrencyTotals(reportOwnerIncomePayments)}
                  detail={`${reportOwnerIncomePayments.length} owner income / commission payment(s)`}
                  icon={TrendingUp}
                  tone="bg-sky-50 text-sky-700"
                />

                <Metric
                  title="Expenses recorded"
                  value={money(spent)}
                  detail={`${reportExpenses.length} expense record(s); supplier payments are shown separately`}
                  icon={TrendingDown}
                  tone="bg-amber-50 text-amber-700"
                />

                <Metric
                  title="Supplier payments"
                  value={money(supplierPaid)}
                  detail={`${reportSupplierPayments.length} supplier payment record(s) in period`}
                  icon={CreditCard}
                  tone="bg-orange-50 text-orange-700"
                />

                <Metric
                  title="Outstanding invoices"
                  value={money(outstanding)}
                  detail="Estimated unpaid balance of invoices in the selected period"
                  icon={Activity}
                  tone="bg-violet-50 text-violet-700"
                />
              </section>

              <section className={`${panel} mb-6 report-chart-panel`}>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9f1d35]">Visual analytics</p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Financial performance</h2>
                    <p className="mt-1 text-sm text-slate-500">Compare invoiced sales, customer collections and recorded expenses over the selected period.</p>
                  </div>
                  <span className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[#9f1d35]"><ChartNoAxesCombined size={21} /></span>
                </div>
                <AnimatedTrendChart data={monthlyFinancialTrend} />
              </section>

              <section className="mb-6 grid gap-5 xl:grid-cols-2">
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold">Expense mix</h2><p className="mt-1 text-sm text-slate-500">Pie chart of recorded expenses by category.</p></div>
                    <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><PieChart size={20} /></span>
                  </div>
                  <AnimatedDonut data={categories} total={spent} />
                  <p className="mt-4 text-xs text-slate-400">Category percentages use recorded expense totals in the selected period. Supplier payments remain separate to avoid double-counting.</p>
                </article>
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div><h2 className="text-lg font-bold">Cash movement</h2><p className="mt-1 text-sm text-slate-500">Customer collections compared with supplier payments.</p></div>
                    <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Activity size={20} /></span>
                  </div>
                  <div className="space-y-5 pt-2">
                    {[{ label: "Customer collections", value: collected, color: "#0f766e" }, { label: "Supplier payments", value: supplierPaid, color: "#f97316" }].map((item, index) => <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{item.label}</span><strong className="tabular-nums">{money(item.value)}</strong></div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="report-animated-fill h-full rounded-full" style={{ width: `${Math.min(100, item.value / Math.max(1, collected, supplierPaid) * 100)}%`, backgroundColor: item.color, animationDelay: `${index * 160}ms` }} /></div>
                    </div>)}
                    <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net customer-to-supplier movement</p><p className={`mt-2 text-2xl font-bold ${collected - supplierPaid >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(collected - supplierPaid)}</p><p className="mt-2 text-xs leading-5 text-slate-500">Collections minus supplier payments only; other cash movements are not included.</p></div>
                  </div>
                </article>
              </section>

              <section className="mb-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                <article className={panel}>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">Expense breakdown</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Recorded spending by category in the selected period
                      </p>
                    </div>
                    <span className="rounded-xl bg-amber-50 p-2.5 text-amber-700">
                      <ChartNoAxesCombined size={20} />
                    </span>
                  </div>

                  {categories.length ? (
                    <div className="space-y-4">
                      {categories.map(([name, value]) => (
                        <div key={name}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-slate-700">{name}</span>
                            <span className="font-semibold tabular-nums text-slate-900">
                              {money(value)}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#F3192D]"
                              style={{
                                width: `${Math.max(2, (value / Math.max(1, spent)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                      No expense records found for this period.
                    </p>
                  )}

                  <p className="mt-4 text-xs leading-5 text-slate-400">
                    Supplier payments are displayed separately and are not added to
                    these expense category totals.
                  </p>
                </article>

                <article className={panel}>
                  <div className="mb-5">
                    <h2 className="text-lg font-bold">Financial position</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Customer collections and recorded supplier cash outflows
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-600">Payments received</span>
                        <strong>{money(collected)}</strong>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.min(100, (collected / maxCashBar) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-600">Supplier payments</span>
                        <strong>{money(supplierPaid)}</strong>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{
                            width: `${Math.min(100, (supplierPaid / maxCashBar) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Net customer-to-supplier cash movement
                      </p>
                      <p
                        className={`mt-2 text-2xl font-bold ${
                          collected - supplierPaid >= 0
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {money(collected - supplierPaid)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Customer payments received minus supplier payments recorded.
                        Other expense payments, transfers, taxes and other cash
                        movements are not included in this estimate.
                      </p>
                    </div>
                  </div>
                </article>
              </section>

              <section className={`${panel} mb-6`}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Owner income received by day and month</h2>
                  <p className="mt-1 text-sm text-slate-500">Based on actual recorded payment dates, including partial payments. Only payments within the selected reporting period are included.</p>
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
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Recent supplier payments</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Supplier payments made during the selected period, including
                      standalone payments
                    </p>
                  </div>
                  <Link
                    href="/workspace/finance/supplier-payments"
                    className="text-sm font-semibold text-[#F3192D] hover:underline"
                  >
                    Manage supplier payments →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Supplier</th>
                        <th className="px-3 py-3">Reference</th>
                        <th className="px-3 py-3">Linked expense</th>
                        <th className="px-3 py-3">Linked invoice</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSupplierPayments.length ? (
                        recentSupplierPayments.map((row, index) => (
                          <tr
                            key={String(row.id ?? index)}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >
                            <td className="px-3 py-3 text-slate-600">
                              {labelDate(dateOf(row))}
                            </td>
                            <td className="px-3 py-3 font-semibold text-slate-800">
                              {String(row.supplier_name ?? "Supplier")}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {String(row.payment_reference ?? "—")}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {String(row.expense_description ?? "Standalone payment")}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {String(row.invoice_number ?? "—")}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">
                              {money(amount(row), String(row.currency ?? "UGX"))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                            No supplier payments found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={`${panel} mb-6`}>
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Management Statement of Profit and Loss</h2>
                  <p className="mt-1 text-sm text-slate-500">Issued invoice totals less recorded expenses for the selected period, shown separately by currency.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Currency</th><th className="px-3 py-3 text-right">Invoice revenue</th><th className="px-3 py-3 text-right">Expenses</th><th className="px-3 py-3 text-right">Operating result</th></tr></thead>
                    <tbody>{profitLossByCurrency.map((row) => <tr key={row.currency} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold">{row.currency}</td><td className="px-3 py-3 text-right">{money(row.revenue, row.currency)}</td><td className="px-3 py-3 text-right">{money(row.expenses, row.currency)}</td><td className={`px-3 py-3 text-right font-bold ${row.operatingResult < 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(row.operatingResult, row.currency)}</td></tr>)}
                    {!profitLossByCurrency.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-500">No invoice or expense records for this period.</td></tr>}</tbody>
                  </table>
                </div>
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">Management view only — not a full general-ledger P&amp;L. A complete balance sheet requires reconciled cash/bank, receivables, liabilities, assets, tax and owner-equity balances.</p>
              </section>

              <section className={`${panel} mb-6 hidden`}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">Recent invoices</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Latest invoices within the selected period
                    </p>
                  </div>
                  <Link
                    href="/workspace/finance/invoices"
                    className="text-sm font-semibold text-[#F3192D] hover:underline"
                  >
                    Open invoices →
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Invoice</th>
                        <th className="px-3 py-3">Customer</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentInvoices.length ? (
                        recentInvoices.map((row, index) => (
                          <tr
                            key={String(row.id ?? index)}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                          >
                            <td className="px-3 py-3 font-semibold text-slate-800">
                              {String(
                                row.invoice_number ??
                                  row.invoice_no ??
                                  row.number ??
                                  (row.id ? `INV-${String(row.id).slice(0, 8)}` : "Invoice")
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {String(
                                row.customer_name ??
                                  (typeof row.customer === "string" ? row.customer : "") ??
                                  "Customer"
                              )}
                            </td>
                            <td className="px-3 py-3 text-slate-600">
                              {labelDate(dateOf(row))}
                            </td>
                            <td className="px-3 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                                {normal(row.status)}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">
                              {money(amount(row), String(row.currency ?? "UGX"))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                            No invoices found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
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
