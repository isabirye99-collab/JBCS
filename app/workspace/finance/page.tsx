
"use client";


import "./finance.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileBarChart,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Package,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

type Customer = {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
};

type Invoice = {
  id: string;
  invoice_number?: string | null;
  invoice_no?: string | null;
  number?: string | null;
  customer_name?: string | null;
  customer?: { name?: string } | string | null;
  total?: number | string | null;
  total_amount?: number | string | null;
  amount?: number | string | null;
  amount_due?: number | string | null;
  status?: string | null;
  due_date?: string | null;
  issue_date?: string | null;
  created_at?: string | null;
  currency?: string | null;
};

type Expense = {
  id: string;
  description?: string | null;
  name?: string | null;
  category?: string | null;
  amount?: number | string | null;
  total?: number | string | null;
  expense_date?: string | null;
  date?: string | null;
  created_at?: string | null;
};

type SupplierPayment = {
  id: string;
  supplier_name?: string | null;
  expense_description?: string | null;
  invoice_number?: string | null;
  payment_date?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const navigation: { heading: string; items: NavItem[] }[] = [
  {
    heading: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        href: "/workspace/finance",
        icon: LayoutDashboard,
      },
      {
        label: "Customers",
        href: "/workspace/finance/customers",
        icon: Users,
      },
      
    ],
  },
  {
    heading: "SALES",
    items: [
      {
        label: "Invoices",
        href: "/workspace/finance/invoices",
        icon: FileText,
      },
      {
        label: "Quotes",
        href: "/workspace/finance/quotes",
        icon: FilePlus2,
      },
      {
        label: "Sales Receipts",
        href: "/workspace/finance/receipts",
        icon: Receipt,
      },
      {
        label: "Payments",
        href: "/workspace/finance/payments",
        icon: CreditCard,
      },
    ],
  },
  {
    heading: "FINANCE",
    items: [
      {
        label: "Expenses",
        href: "/workspace/finance/expenses",
        icon: Wallet,
      },
      {
        label: "Owner's Income & Commissions",
        href: "/workspace/finance/owner-income",
        icon: Wallet,
      },
      {
        label: "Reports",
        href: "/workspace/finance/reports",
        icon: FileBarChart,
      },
    ],
  },
];

function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function invoiceAmount(invoice: Invoice): number {
  return asNumber(
    invoice.amount_due ?? invoice.total_amount ?? invoice.total ?? invoice.amount
  );
}

function expenseAmount(expense: Expense): number {
  return asNumber(expense.amount ?? expense.total);
}

function supplierPaymentAmount(payment: SupplierPayment): number {
  return asNumber(payment.amount);
}

function invoiceNumber(invoice: Invoice): string {
  return (
    invoice.invoice_number ??
    invoice.invoice_no ??
    invoice.number ??
    `INV-${invoice.id.slice(0, 8).toUpperCase()}`
  );
}

function customerName(invoice: Invoice): string {
  if (typeof invoice.customer === "string") return invoice.customer;

  return (
    invoice.customer_name ??
    invoice.customer?.name ??
    "Customer"
  );
}

function dateLabel(value?: string | null): string {
  if (!value) return "Ã¢â‚¬â€";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Ã¢â‚¬â€";

  return new Intl.DateTimeFormat("en-UG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function money(value: number, currency = "UGX"): string {
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value).toLocaleString("en-UG")}`;
  }
}

function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isThisMonth(value?: string | null): boolean {
  if (!value) return false;

  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date >= monthStart() &&
    date <= new Date()
  );
}

function normalStatus(value?: string | null): string {
  return (value ?? "unknown").trim().toLowerCase().replace(/[_-]+/g, " ");
}

function isPaid(invoice: Invoice): boolean {
  return ["paid", "completed", "complete"].includes(
    normalStatus(invoice.status)
  );
}

function isCancelled(invoice: Invoice): boolean {
  return ["cancelled", "canceled", "void", "deleted"].includes(
    normalStatus(invoice.status)
  );
}

function isOverdue(invoice: Invoice): boolean {
  if (isPaid(invoice) || isCancelled(invoice)) return false;

  if (!invoice.due_date) return false;

  const due = new Date(invoice.due_date);
  if (Number.isNaN(due.getTime())) return false;

  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

function StatusBadge({ status }: { status?: string | null }) {
  const value = normalStatus(status);
  const overdue = value === "overdue";

  const style =
    value === "paid" || value === "completed" || value === "complete"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : overdue
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : value === "draft"
          ? "bg-slate-100 text-slate-600 ring-slate-200"
          : value === "cancelled" || value === "canceled" || value === "void"
            ? "bg-rose-50 text-rose-600 ring-rose-200"
            : "bg-amber-50 text-amber-700 ring-amber-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${style}`}
    >
      {status ? normalStatus(status) : "Unknown"}
    </span>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: "blue" | "green" | "amber" | "purple";
}) {
  const tones = {
    blue: "bg-blue-50 text-[#F3192D]",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  href,
  linkText = "View all",
}: {
  title: string;
  subtitle: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#F3192D] hover:text-blue-900"
        >
          {linkText}
          <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [planKey, setPlanKey] = useState("basic");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/saas/me", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (active && typeof data?.email === "string") {
          setAccountEmail(data.email);
        }
        if (active && data?.isSuperAdmin === true) {
          setIsSuperAdmin(true);
          setPlanKey("pro");
        }
      })
      .catch(() => {
        // Keep the dashboard usable if account details cannot be loaded.
      });

    return () => {
      active = false;
    };
  }, []);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const planResponse = await fetch("/api/saas/plan", { cache: "no-store", credentials: "same-origin" });
      const planData = await planResponse.json();
      if (!planResponse.ok) throw new Error(planData.error || "Could not verify the subscription plan.");
      const adminAccess = !!planData.plan?.isSuperAdmin;
      const effectivePlan = planData.plan?.key === "pro" || adminAccess ? "pro" : "basic";
      setPlanKey(effectivePlan);
      setIsSuperAdmin(adminAccess);

      const requests = [
        fetch("/api/saas/customers", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/saas/invoices", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/saas/expenses", { cache: "no-store", credentials: "same-origin" }),
      ];
      const labels = ["customers", "invoices", "expenses"];
      if (effectivePlan === "pro") {
        requests.push(fetch("/api/saas/supplier-payments", { cache: "no-store", credentials: "same-origin" }));
        labels.push("supplier payments");
      }
      const results = await Promise.allSettled(requests);
      const data: Record<string, unknown> = {};
      const errors: string[] = [];

      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const label = labels[index];

        if (result.status === "rejected") {
          errors.push(`Could not load ${label}.`);
          continue;
        }

        if (!result.value.ok) {
          let message = "";

          try {
            const body = await result.value.clone().json();
            message =
              typeof body?.error === "string" ? body.error : "";
          } catch {
            // Keep the fallback message if the response is not JSON.
          }

          if (result.value.status === 402) {
            errors.push(
              message ||
                "Your workspace subscription could not be verified. Finance data is temporarily unavailable."
            );
          } else if (result.value.status === 401) {
            errors.push("Your session has expired. Please sign in again.");
          } else if (result.value.status === 409) {
            errors.push(
              message || "Please select an authorised workspace."
            );
          } else {
            errors.push(
              message || `Could not load ${label} (HTTP ${result.value.status}).`
            );
          }

          continue;
        }

        try {
          data[label] = await result.value.json();
        } catch {
          errors.push(`The ${label} response could not be read.`);
        }
      }

      const customerPayload = data.customers as
        | { customers?: Customer[] }
        | undefined;
      const invoicePayload = data.invoices as
        | { invoices?: Invoice[] }
        | undefined;
      const expensePayload = data.expenses as
        | { expenses?: Expense[] }
        | undefined;
      const supplierPaymentPayload = data["supplier payments"] as
        | { payments?: SupplierPayment[]; migration_required?: boolean }
        | undefined;

      setCustomers(
        Array.isArray(customerPayload?.customers)
          ? customerPayload.customers
          : []
      );
      setInvoices(
        Array.isArray(invoicePayload?.invoices)
          ? invoicePayload.invoices
          : []
      );
      setExpenses(
        Array.isArray(expensePayload?.expenses)
          ? expensePayload.expenses
          : []
      );
      setSupplierPayments(
        Array.isArray(supplierPaymentPayload?.payments)
          ? supplierPaymentPayload.payments
          : []
      );
      if (supplierPaymentPayload?.migration_required) {
        errors.push("Supplier payment records could not be loaded. Check the supplier payments database setup.");
      }

      setLastUpdated(new Date());

      if (errors.length) setError([...new Set(errors)].join(" "));
    } catch {
      setError("Unable to load your dashboard. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    const activeInvoices = invoices.filter(
      (invoice) => !isPaid(invoice) && !isCancelled(invoice)
    );

    const outstanding = activeInvoices.reduce(
      (sum, invoice) => sum + invoiceAmount(invoice),
      0
    );

    const overdueInvoices = activeInvoices.filter(isOverdue);

    const monthlyExpenses = expenses
      .filter((expense) =>
        isThisMonth(
          expense.expense_date ?? expense.date ?? expense.created_at
        )
      )
      .reduce(
        (sum, expense) => sum + expenseAmount(expense),
        0
      );

    const monthlySupplierPayments = supplierPayments
      .filter((payment) =>
        isThisMonth(payment.payment_date ?? payment.created_at)
      )
      .reduce((sum, payment) => sum + supplierPaymentAmount(payment), 0);

    const monthlySales = invoices
      .filter(
        (invoice) =>
          isPaid(invoice) &&
          isThisMonth(invoice.issue_date ?? invoice.created_at)
      )
      .reduce(
        (sum, invoice) => sum + invoiceAmount(invoice),
        0
      );

    const recentCustomers = [...customers].sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    );

    const recentInvoices = [...invoices].sort(
      (a, b) =>
        new Date(b.created_at ?? b.issue_date ?? 0).getTime() -
        new Date(a.created_at ?? a.issue_date ?? 0).getTime()
    );

    return {
      customerCount: customers.length,
      invoiceCount: invoices.length,
      outstanding,
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce(
        (sum, invoice) => sum + invoiceAmount(invoice),
        0
      ),
      monthlyExpenses,
      monthlySupplierPayments,
      monthlySales,
      recentSupplierPayments: [...supplierPayments]
        .sort(
          (a, b) =>
            new Date(b.payment_date ?? b.created_at ?? 0).getTime() -
            new Date(a.payment_date ?? a.created_at ?? 0).getTime()
        )
        .slice(0, 5),
      recentCustomers: recentCustomers.slice(0, 5),
      recentInvoices: recentInvoices.slice(0, 6),
      recentExpenses: [...expenses]
        .sort(
          (a, b) =>
            new Date(
              b.expense_date ?? b.date ?? b.created_at ?? 0
            ).getTime() -
            new Date(
              a.expense_date ?? a.date ?? a.created_at ?? 0
            ).getTime()
        )
        .slice(0, 5),
    };
  }, [customers, invoices, expenses, supplierPayments]);

  const filteredInvoices = stats.recentInvoices.filter((invoice) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return [
      invoiceNumber(invoice),
      customerName(invoice),
      invoice.status ?? "",
    ].some((value) => value.toLowerCase().includes(term));
  });

  const today = new Intl.DateTimeFormat("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden h-screen w-64 shrink-0 sticky top-0 flex-col border-r border-slate-200 bg-white text-slate-900 lg:flex">
          <Link
            href="/workspace/finance"
            className="flex items-center gap-3 border-b border-slate-100 px-6 py-5"
          >
            <img src="/johden-logo.svg" alt="Johden Business Consultancy Services" className="h-14 w-14 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold tracking-tight">
                JOH DEN
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Business Finance
              </p>
            </div>
          </Link>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
            {navigation.map((group) => (
              <div key={group.heading} className="mb-7">
                <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-slate-400">
                  {group.heading}
                </p>

                <nav className="space-y-1">
                  {group.items.filter((item) => isSuperAdmin || planKey === "pro" || !["Owner's Income & Commissions", "Reports"].includes(item.label)).map((item) => {
                    const Icon = item.icon;
                    const active = item.label === "Dashboard";

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          active ? "bg-[#fff0f1] text-[#9f1d35]" : "text-slate-600 hover:bg-[#fff5f5] hover:text-[#9f1d35]"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            active ? "text-[#9f1d35]" : "text-slate-400"
                          }
                        />
                        <span>{item.label}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F3192D]" />
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-4">
            <Link
              href="/workspace/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium text-slate-600 hover:bg-[#fff5f5] hover:text-[#9f1d35]"
            >
              <Settings size={18} className="text-slate-400" />
              Settings
              <ArrowRight size={15} className="ml-auto" />
            </Link>

            <div className="mt-3 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Johden Finance
              </p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Manage your business finances in one place.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 jbcs-finance-consistent-main">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-10">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/johden-logo.svg" alt="Johden logo" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Johden Business Consultancy Services
                  </p>
                  <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                    Dashboard
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => void loadDashboard(true)}
                  disabled={loading || refreshing}
                  title="Refresh dashboard"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={17}
                    className={
                      refreshing ? "animate-spin" : ""
                    }
                  />
                </button>
                <button
                  type="button"
                  title="Notifications"
                  className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 sm:flex"
                >
                  <Bell size={18} />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F3192D] ring-2 ring-white" />
                </button>
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="hidden min-w-0 text-right sm:block">
                    <p className="max-w-[220px] truncate text-sm font-semibold text-slate-800">
                      {accountEmail || "Signed-in user"}
                    </p>
                    <p className="text-xs text-slate-500">Logged in</p>
                  </div>
                  <form action="/api/saas/logout" method="post">
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#F3192D] hover:bg-[#fff5f5] hover:text-[#9f1d35]"
                    >
                      <span aria-hidden="true">â†ª</span>
                      <span>Log Out</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-6 xl:p-10">
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays size={16} />
                  {today}
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome to your workspace
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep track of customers, sales, outstanding invoices and
                  business expenses from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/workspace/finance/customers"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <Plus size={17} />
                  Add customer
                </Link>
                <Link
                  href="/workspace/finance/invoices"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#CF1022]"
                >
                  <FilePlus2 size={17} />
                  Create invoice
                </Link>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <XCircle
                  size={21}
                  className="mt-0.5 shrink-0 text-amber-700"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-amber-900">
                    Some dashboard information is unavailable
                  </p>
                  <p className="mt-1 text-sm leading-6 text-amber-800">
                    {error}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadDashboard(true)}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
              <MetricCard
                title="Total customers"
                value={
                  loading && customers.length === 0
                    ? "Ã¢â‚¬â€"
                    : customers.length.toLocaleString("en-UG")
                }
                detail="Customers registered in your workspace"
                icon={Users}
                tone="blue"
              />
              <MetricCard
                title="Outstanding invoices"
                value={
                  loading && invoices.length === 0
                    ? "Ã¢â‚¬â€"
                    : money(stats.outstanding)
                }
                detail={`${stats.overdueCount} overdue invoice${stats.overdueCount === 1 ? "" : "s"}`}
                icon={CircleDollarSign}
                tone="amber"
              />
              <MetricCard
                title="Sales collected this month"
                value={
                  loading && invoices.length === 0
                    ? "Ã¢â‚¬â€"
                    : money(stats.monthlySales)
                }
                detail="Paid invoices recorded this month"
                icon={ChartNoAxesCombined}
                tone="green"
              />
              <MetricCard
                title="Expenses this month"
                value={
                  loading && expenses.length === 0
                    ? "Ã¢â‚¬â€"
                    : money(stats.monthlyExpenses)
                }
                detail="Expense records only; supplier payments are shown separately"
                icon={Wallet}
                tone="purple"
              />
              {(planKey === "pro" || isSuperAdmin) && <MetricCard
                title="Supplier payments this month"
                value={
                  loading && supplierPayments.length === 0
                    ? "Ã¢â‚¬â€"
                    : money(stats.monthlySupplierPayments)
                }
                detail="Cash paid to suppliers this month; not added again to expenses"
                icon={CreditCard}
                tone="amber"
              />}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
              <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle
                  title="Recent invoices"
                  subtitle="A quick view of your latest billing activity"
                  href="/workspace/finance/invoices"
                />

                <div className="mt-5">
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Search size={17} className="shrink-0 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search recent invoices..."
                      aria-label="Search recent invoices"
                      className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          <th className="pb-3 pr-3">Invoice</th>
                          <th className="pb-3 pr-3">Customer</th>
                          <th className="pb-3 pr-3">Date</th>
                          <th className="pb-3 pr-3">Amount</th>
                          <th className="pb-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading && invoices.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <LoaderCircle
                                size={22}
                                className="mx-auto animate-spin text-[#F3192D]"
                              />
                              <p className="mt-2 text-sm text-slate-500">
                                Loading invoices...
                              </p>
                            </td>
                          </tr>
                        ) : filteredInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                <FileText size={23} />
                              </div>
                              <p className="mt-3 text-sm font-semibold text-slate-700">
                                No invoices to display
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {search
                                  ? "Try another search term."
                                  : "Your recent invoices will appear here."}
                              </p>
                            </td>
                          </tr>
                        ) : (
                          filteredInvoices.map((invoice) => (
                            <tr
                              key={invoice.id}
                              className="transition hover:bg-slate-50/80"
                            >
                              <td className="py-4 pr-3">
                                <span className="text-sm font-semibold text-slate-800">
                                  {invoiceNumber(invoice)}
                                </span>
                              </td>
                              <td className="max-w-[150px] truncate py-4 pr-3 text-sm text-slate-600">
                                {customerName(invoice)}
                              </td>
                              <td className="whitespace-nowrap py-4 pr-3 text-xs text-slate-500">
                                {dateLabel(
                                  invoice.issue_date ?? invoice.created_at
                                )}
                              </td>
                              <td className="whitespace-nowrap py-4 pr-3 text-sm font-semibold text-slate-800">
                                {money(invoiceAmount(invoice), invoice.currency || "UGX")}
                              </td>
                              <td className="py-4">
                                <StatusBadge
                                  status={
                                    isOverdue(invoice)
                                      ? "overdue"
                                      : invoice.status
                                  }
                                />
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Link
                  href="/workspace/finance/invoices"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Open invoice register
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <SectionTitle
                    title="Quick actions"
                    subtitle="Common tasks for your business"
                  />

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {[
                      {
                        title: "Create an invoice",
                        description: "Bill a customer",
                        icon: FilePlus2,
                        href: "/workspace/finance/invoices",
                        tone: "bg-blue-50 text-[#F3192D]",
                      },
                      {
                        title: "Add a customer",
                        description: "Register a client",
                        icon: Users,
                        href: "/workspace/finance/customers",
                        tone: "bg-emerald-50 text-emerald-700",
                      },
                      {
                        title: "Record an expense",
                        description: "Track business spending",
                        icon: Wallet,
                        href: "/workspace/finance/expenses",
                        tone: "bg-amber-50 text-amber-700",
                      },
                      {
                        title: "View reports",
                        description: "Review business performance",
                        icon: FileBarChart,
                        href: "/workspace/finance/reports",
                        tone: "bg-violet-50 text-violet-700",
                      },
                    ].map((action) => {
                      const Icon = action.icon;

                      return (
                        <Link
                          key={action.title}
                          href={action.href}
                          className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${action.tone}`}
                          >
                            <Icon size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {action.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {action.description}
                            </p>
                          </div>
                          <ArrowRight
                            size={16}
                            className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#F3192D]"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 p-5 text-white shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-blue-100">
                        Outstanding payments
                      </p>
                      <p className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                        {money(stats.outstanding)}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-blue-100">
                        {stats.overdueCount} overdue invoice
                        {stats.overdueCount === 1 ? "" : "s"} need
                        {stats.overdueCount === 1 ? "s" : ""} attention.
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3">
                      <Activity size={22} />
                    </div>
                  </div>
                  <Link
                    href="/workspace/finance/invoices"
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-50"
                  >
                    Review invoices
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle
                  title="Recent customers"
                  subtitle="Latest customers added to your workspace"
                  href="/workspace/finance/customers"
                />

                <div className="mt-5 divide-y divide-slate-100">
                  {loading && customers.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                      <LoaderCircle
                        size={18}
                        className="mr-2 animate-spin text-[#F3192D]"
                      />
                      Loading customers...
                    </div>
                  ) : stats.recentCustomers.length === 0 ? (
                    <div className="py-10 text-center">
                      <Users
                        size={25}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No customers yet
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Add your first customer to get started.
                      </p>
                      <Link
                        href="/workspace/finance/customers"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#CF1022]"
                      >
                        <Plus size={16} />
                        Add customer
                      </Link>
                    </div>
                  ) : (
                    stats.recentCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center gap-3 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#F3192D]">
                          {(customer.name?.trim().charAt(0) || "C").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {customer.name || "Unnamed customer"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {customer.email || customer.phone || "No contact details"}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-slate-400">
                          {dateLabel(customer.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle
                  title="Recent expenses"
                  subtitle="Latest recorded business spending"
                  href="/workspace/finance/expenses"
                />

                <div className="mt-5 divide-y divide-slate-100">
                  {loading && expenses.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                      <LoaderCircle
                        size={18}
                        className="mr-2 animate-spin text-[#F3192D]"
                      />
                      Loading expenses...
                    </div>
                  ) : stats.recentExpenses.length === 0 ? (
                    <div className="py-10 text-center">
                      <Wallet
                        size={25}
                        className="mx-auto text-slate-300"
                      />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No expenses recorded
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Recorded expenses will appear here.
                      </p>
                      <Link
                        href="/workspace/finance/expenses"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus size={16} />
                        Record expense
                      </Link>
                    </div>
                  ) : (
                    stats.recentExpenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                          <ShoppingBag size={19} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {expense.description ||
                              expense.name ||
                              expense.category ||
                              "Business expense"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {expense.category || "General"} Ã‚Â·{" "}
                            {dateLabel(
                              expense.expense_date ??
                                expense.date ??
                                expense.created_at
                            )}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-800">
                          {money(expenseAmount(expense))}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {(planKey === "pro" || isSuperAdmin) && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionTitle
                  title="Recent supplier payments"
                  subtitle="Latest payments made to suppliers"
                  href="/workspace/finance/supplier-payments"
                />

                <div className="mt-5 divide-y divide-slate-100">
                  {loading && supplierPayments.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-slate-500">
                      <LoaderCircle
                        size={18}
                        className="mr-2 animate-spin text-[#F3192D]"
                      />
                      Loading supplier payments...
                    </div>
                  ) : stats.recentSupplierPayments.length === 0 ? (
                    <div className="py-10 text-center">
                      <CreditCard size={25} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        No supplier payments recorded
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Payments made to suppliers will appear here.
                      </p>
                      <Link
                        href="/workspace/finance/supplier-payments"
                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Plus size={16} />
                        View supplier payments
                      </Link>
                    </div>
                  ) : (
                    stats.recentSupplierPayments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 py-4"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                          <CreditCard size={19} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {payment.supplier_name || "Supplier"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {payment.payment_reference || payment.payment_method || "Supplier payment"} Ã‚Â·{" "}
                            {dateLabel(payment.payment_date ?? payment.created_at)}
                          </p>
                          {(payment.expense_description || payment.invoice_number) && (
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {payment.expense_description ||
                                (payment.invoice_number ? `Invoice ${payment.invoice_number}` : "")}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-800">
                          {money(supplierPaymentAmount(payment), payment.currency || "UGX")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </div>}
            </section>

            <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center">
              <p>Johden Business Consultancy Services Ã‚Â· Finance workspace</p>
              <p>
                {lastUpdated
                  ? `Last refreshed ${lastUpdated.toLocaleTimeString("en-UG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Dashboard"}
              </p>
            </footer>
          </div>

          <nav className="sticky bottom-0 z-20 grid grid-cols-3 border-t border-slate-200 bg-white px-1 py-2 lg:hidden">
            {[
              {
                label: "Home",
                href: "/workspace/finance",
                icon: LayoutDashboard,
              },
              {
                label: "Customers",
                href: "/workspace/finance/customers",
                icon: Users,
              },
              {
                label: "Invoices",
                href: "/workspace/finance/invoices",
                icon: FileText,
              },
              {
                label: "Expenses",
                href: "/workspace/finance/expenses",
                icon: Wallet,
              },
              {
                label: "Owner Income",
                href: "/workspace/finance/owner-income",
                icon: Wallet,
              },
              {
                label: "Reports",
                href: "/workspace/finance/reports",
                icon: FileBarChart,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium ${
                    item.label === "Home"
                      ? "text-[#F3192D]"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </main>
      </div>
    </div>
  );
}



