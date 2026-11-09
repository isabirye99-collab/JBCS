
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

export default function FinanceReportsPage() {
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<Row[]>([]);

  const [start, setStart] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().slice(0, 10);
  });

  const [end, setEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [invoiceResponse, paymentResponse, expenseResponse, supplierResponse] =
        await Promise.all([
          fetch("/api/saas/invoices", { cache: "no-store" }),
          fetch("/api/saas/payments", { cache: "no-store" }),
          fetch("/api/saas/expenses", { cache: "no-store" }),
          fetch("/api/saas/supplier-payments", { cache: "no-store" }),
        ]);

      const [invoiceData, paymentData, expenseData, supplierData] = await Promise.all([
        invoiceResponse.json(),
        paymentResponse.json(),
        expenseResponse.json(),
        supplierResponse.json(),
      ]);

      const failures = [
        !invoiceResponse.ok && (invoiceData.error || "Invoices could not be loaded."),
        !paymentResponse.ok && (paymentData.error || "Customer payments could not be loaded."),
        !expenseResponse.ok && (expenseData.error || "Expenses could not be loaded."),
        !supplierResponse.ok &&
          (supplierData.error || "Supplier payments could not be loaded."),
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
                Review invoices, customer collections, expenses and supplier payments
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
