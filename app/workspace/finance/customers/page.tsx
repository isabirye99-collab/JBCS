
"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FilePlus2,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Receipt,
  Search,
  Users,
  X,
  UsersRound,
  Wallet,
  FileBarChart,
  Settings,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_number?: string | null;
  created_at?: string | null;
  is_supplier?: boolean;
};

type CustomerInvoice = {
  id: string;
  invoice_number?: string | null;
  contact_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  total?: number | string | null;
  amount_paid?: number | string | null;
  status?: string | null;
  business_contacts?: { id?: string; name?: string } | null;
};

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

function money(value: number, currency = "UGX") {
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: currency || "UGX",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || "UGX"} ${value.toLocaleString("en-UG")}`;
  }
}

function dateLabel(value?: string | null) {
  if (!value) return "—";

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-UG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "C"
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingSupplier, setUpdatingSupplier] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [isSupplier, setIsSupplier] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [customerResponse, invoiceResponse] = await Promise.all([
        fetch("/api/saas/customers", { cache: "no-store" }),
        fetch("/api/saas/invoices", { cache: "no-store" }),
      ]);

      const [customerData, invoiceData] = await Promise.all([
        customerResponse.json(),
        invoiceResponse.json(),
      ]);

      if (!customerResponse.ok) {
        throw new Error(customerData.error || "Unable to load customers.");
      }

      const customerRows = Array.isArray(customerData.customers)
        ? (customerData.customers as Customer[])
        : [];

      setCustomers(customerRows);

      if (!selectedId && customerRows.length) {
        setSelectedId(customerRows[0].id);
      }

      if (invoiceResponse.ok) {
        setInvoices(
          Array.isArray(invoiceData.invoices)
            ? (invoiceData.invoices as CustomerInvoice[])
            : []
        );
      } else {
        setInvoices([]);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to connect to the customer service."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.tax_number,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [customers, search]);

  const selectedCustomer =
    customers.find((customer) => customer.id === selectedId) ||
    filteredCustomers[0] ||
    null;

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];

    return invoices
      .filter(
        (invoice) =>
          invoice.contact_id === selectedCustomer.id ||
          invoice.business_contacts?.id === selectedCustomer.id
      )
      .sort((a, b) =>
        String(b.issue_date || "").localeCompare(
          String(a.issue_date || "")
        )
      );
  }, [invoices, selectedCustomer]);

  const outstanding = customerInvoices.reduce((sum, invoice) => {
    if (
      ["void", "cancelled"].includes(
        String(invoice.status || "").toLowerCase()
      )
    ) {
      return sum;
    }

    return (
      sum +
      Math.max(
        0,
        Number(invoice.total || 0) -
          Number(invoice.amount_paid || 0)
      )
    );
  }, 0);

  const invoiceCurrencies = Array.from(
    new Set(customerInvoices.map((invoice) => invoice.currency || "UGX"))
  );

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/saas/customers", {
        method: editingCustomerId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingCustomerId ? { id: editingCustomerId } : {}),
          name,
          email,
          phone,
          address,
          tax_number: taxNumber,
          is_supplier: isSupplier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save this customer.");
      }

      const created = data.customer as Customer | null;

      setName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setTaxNumber("");
      setIsSupplier(false);
      setShowForm(false);
      setEditingCustomerId(null);

      setNotice(
        editingCustomerId
          ? "Customer details updated successfully."
          : isSupplier
            ? "Customer registered successfully and marked as a supplier."
            : "Customer registered successfully."
      );

      if (created?.id) {
        setSelectedId(created.id);
      }

      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleSupplier(customer: Customer) {
    setUpdatingSupplier(true);
    setError("");
    setNotice("");

    const nextSupplierStatus = !customer.is_supplier;

    try {
      const response = await fetch("/api/saas/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customer.id,
          is_supplier: nextSupplierStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update the customer's supplier status."
        );
      }

      const updatedCustomer = data.customer as Customer | null;

      if (!updatedCustomer) {
        throw new Error("The server did not return the updated customer.");
      }

      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id
            ? { ...item, ...updatedCustomer }
            : item
        )
      );

      setNotice(
        updatedCustomer.is_supplier
          ? `${customer.name} can now be selected in Supplier Payments.`
          : `${customer.name} is no longer marked as a supplier.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update supplier status."
      );
    } finally {
      setUpdatingSupplier(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <Link
            href="/workspace/finance"
            className="flex items-center gap-3 border-b border-slate-100 px-6 py-6"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#f5dfe2] bg-white">
              <img
                src="/johden-logo.svg"
                alt="Johden logo"
                className="h-full w-full object-contain"
              />
            </span>

            <span>
              <span className="block text-sm font-extrabold tracking-wide text-slate-900">
                JOHDEN
              </span>
              <span className="block text-xs text-slate-500">
                Business Consultancy &amp; Finance
              </span>
            </span>
          </Link>

          <div className="px-4 pt-6">
            <p className="px-3 pb-3 text-[10px] font-bold tracking-[0.18em] text-slate-400">
              WORKSPACE
            </p>

            <nav className="space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Customers";

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[#FDE8EA] text-[#A80D1B]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                    {active && (
                      <ChevronRight className="ml-auto" size={16} />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-100 p-5">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Johden Business Suite
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Customer records, invoices and finance in one place.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 jbcs-finance-consistent-main">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-7 lg:px-9">
            <div className="flex items-center gap-3">
              <Link
                href="/workspace/finance"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Back to dashboard"
              >
                <ArrowLeft size={18} />
              </Link>

              <div>
                <p className="text-xs font-medium text-slate-500">
                  Johden Business Suite / Workspace
                </p>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
                  Customers
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setError("");
                setNotice("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F3192D] px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#CF1022] sm:px-4"
            >
              <Plus size={17} />
              <span className="hidden sm:inline">Add customer</span>
              <span className="sm:hidden">Add</span>
            </button>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-7 lg:p-9">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-semibold text-[#F3192D]">
                  CUSTOMER MANAGEMENT
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Know your customers.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Keep customer contact details organised and find their
                  invoice history from one place. A customer can also be
                  registered as a supplier.
                </p>
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone, email or TIN..."
                  aria-label="Search customers"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                />
              </div>
            </div>

            {notice && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
              >
                <CheckCircle2 size={18} />
                <span>{notice}</span>
                <button
                  type="button"
                  className="ml-auto"
                  onClick={() => setNotice("")}
                  aria-label="Dismiss message"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
                <button
                  type="button"
                  onClick={() => setError("")}
                  className="ml-3 font-bold underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Total customers
                  </p>
                  <span className="rounded-xl bg-[#FDE8EA] p-2.5 text-[#A80D1B]">
                    <Users size={19} />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                  {loading ? "—" : customers.length.toLocaleString("en-UG")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Registered in your workspace
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    With email addresses
                  </p>
                  <span className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Mail size={19} />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                  {loading
                    ? "—"
                    : customers.filter((customer) => customer.email).length.toLocaleString("en-UG")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Available for customer correspondence
                </p>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">
                    Marked as suppliers
                  </p>
                  <span className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                    <Building2 size={19} />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
                  {loading
                    ? "—"
                    : customers.filter((customer) => customer.is_supplier).length.toLocaleString("en-UG")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Customers also supplying your business
                </p>
              </article>
            </div>

            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[240px] flex-1 text-sm font-semibold text-slate-700">Search customers
                  <span className="relative mt-2 block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, email or TIN…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm font-normal outline-none focus:border-[#F3192D]" /></span>
                </label>
                <button type="button" onClick={() => setShowDirectory((value) => !value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:border-rose-200 hover:text-[#A80D1B]">{showDirectory ? "Hide customer directory" : "Browse full directory"}</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Five customers are shown in Quick access. Search by name, phone, email or TIN to find any other customer, then select the result to open the profile and edit it.</p>
            </section>
            
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
<section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h3 className="font-bold text-slate-900">Quick access</h3><p className="mt-1 text-xs text-slate-500">Five customer records at a time. Use search above to find anyone else.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{Math.min(5, filteredCustomers.length)} shown</span></div>
              <div className="grid grid-cols-1 gap-2 p-3">{filteredCustomers.slice(0,5).map((customer) => <button key={customer.id} type="button" onClick={() => setSelectedId(customer.id)} className={`rounded-xl border p-3 text-left transition ${selectedCustomer?.id===customer.id?"border-[#F3192D] bg-[#FFF7F7]":"border-slate-200 hover:border-rose-200 hover:bg-slate-50"}`}><span className="block truncate text-sm font-bold text-slate-900">{customer.name}</span><span className="mt-1 block truncate text-xs text-slate-500">{customer.phone || customer.email || "No contact details"}</span></button>)}{filteredCustomers.length===0 && <p className="p-3 text-sm text-slate-500">No customers match that search. Try another search or add a customer.</p>}</div>
            </section>
              {showDirectory && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Customer directory
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Select a customer to view their profile.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {filteredCustomers.length} records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3 sm:px-6">CUSTOMER</th>
                        <th className="px-4 py-3">CONTACT</th>
                        <th className="px-4 py-3">TIN</th>
                        <th className="px-5 py-3 text-right sm:px-6">
                          PROFILE
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-14 text-center text-sm text-slate-500"
                          >
                            <LoaderCircle
                              className="mx-auto mb-2 animate-spin"
                              size={22}
                            />
                            Loading customers...
                          </td>
                        </tr>
                      ) : filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-14 text-center">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDE8EA] text-[#A80D1B]">
                              <Users size={22} />
                            </span>
                            <p className="mt-3 font-semibold text-slate-800">
                              {search
                                ? "No matching customers"
                                : "No customers registered yet"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {search
                                ? "Try another name, phone number or email."
                                : "Add your first customer to get started."}
                            </p>
                            {!search && (
                              <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                className="mt-4 rounded-lg bg-[#F3192D] px-4 py-2 text-sm font-bold text-white hover:bg-[#CF1022]"
                              >
                                Add customer
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <tr
                            key={customer.id}
                            className={`cursor-pointer transition hover:bg-slate-50 ${
                              selectedCustomer?.id === customer.id
                                ? "bg-[#FFF7F7]"
                                : ""
                            }`}
                            onClick={() => setSelectedId(customer.id)}
                          >
                            <td className="px-5 py-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                                    selectedCustomer?.id === customer.id
                                      ? "bg-[#F3192D] text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {initials(customer.name)}
                                </span>

                                <span className="min-w-0">
                                  <span className="block max-w-[220px] truncate text-sm font-bold text-slate-800">
                                    {customer.name}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-400">
                                    Added {dateLabel(customer.created_at)}
                                  </span>
                                  {customer.is_supplier && (
                                    <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                      Also a supplier
                                    </span>
                                  )}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span className="block text-sm text-slate-700">
                                {customer.phone || "No phone"}
                              </span>
                              <span className="mt-1 block max-w-[180px] truncate text-xs text-slate-500">
                                {customer.email || "No email"}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-sm text-slate-600">
                              {customer.tax_number || "—"}
                            </td>

                            <td className="px-5 py-4 text-right sm:px-6">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(customer.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#F8B8BE] hover:text-[#A80D1B]"
                              >
                                View <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>}

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-gradient-to-br from-[#20232B] via-[#A80D1B] to-[#F3192D] px-5 py-5 text-white sm:px-6">
                  <p className="text-xs font-semibold tracking-wide text-white/75">
                    CUSTOMER PROFILE
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-extrabold">
                      {selectedCustomer
                        ? initials(selectedCustomer.name)
                        : "—"}
                    </span>

                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold">
                        {selectedCustomer?.name || "Select a customer"}
                      </h3>
                      <p className="mt-0.5 text-xs text-white/75">
                        {selectedCustomer
                          ? `Customer since ${dateLabel(selectedCustomer.created_at)}`
                          : "Customer details will appear here"}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedCustomer ? (
                  <div className="space-y-5 p-5 sm:p-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                          <Phone size={16} />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold tracking-wider text-slate-400">
                            PHONE
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {selectedCustomer.phone || "Not provided"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                          <Mail size={16} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold tracking-wider text-slate-400">
                            EMAIL
                          </p>
                          <p className="mt-1 break-all text-sm font-medium text-slate-800">
                            {selectedCustomer.email || "Not provided"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                          <MapPin size={16} />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold tracking-wider text-slate-400">
                            ADDRESS
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">
                            {selectedCustomer.address || "Not provided"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-500">
                          <Building2 size={16} />
                        </span>
                        <div>
                          <p className="text-[10px] font-bold tracking-wider text-slate-400">
                            TAX IDENTIFICATION NUMBER
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {selectedCustomer.tax_number || "Not provided"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end"><button type="button" onClick={() => { setName(selectedCustomer.name || ""); setEmail(selectedCustomer.email || ""); setPhone(selectedCustomer.phone || ""); setAddress(selectedCustomer.address || ""); setTaxNumber(selectedCustomer.tax_number || ""); setIsSupplier(Boolean(selectedCustomer.is_supplier)); setEditingCustomerId(selectedCustomer.id); setShowForm(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[#F3192D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#CF1022]"><FileText size={16} /> Edit customer</button></div>

                    {/* Supplier status for existing customers */}
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            Supplier status
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {selectedCustomer.is_supplier
                              ? "This contact is available in Supplier Payments."
                              : "Enable this if the customer also supplies goods or services to your business."}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={updatingSupplier}
                          onClick={() =>
                            void toggleSupplier(selectedCustomer)
                          }
                          className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60 ${
                            selectedCustomer.is_supplier
                              ? "border border-slate-200 text-slate-700 hover:bg-slate-50"
                              : "bg-[#F3192D] text-white hover:bg-[#CF1022]"
                          }`}
                        >
                          {updatingSupplier ? (
                            <LoaderCircle
                              size={14}
                              className="animate-spin"
                            />
                          ) : selectedCustomer.is_supplier ? (
                            "Remove supplier"
                          ) : (
                            "Mark as supplier"
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">
                            Linked invoices
                          </p>
                          <p className="mt-1 text-2xl font-extrabold text-slate-900">
                            {customerInvoices.length}
                          </p>
                        </div>
                        <span className="rounded-xl bg-white p-2.5 text-slate-600 shadow-sm">
                          <FileText size={19} />
                        </span>
                      </div>

                      <div className="mt-3 border-t border-slate-200 pt-3">
                        <p className="text-xs text-slate-500">
                          Outstanding balance
                        </p>
                        {invoiceCurrencies.length <= 1 ? (
                          <p className="mt-1 text-lg font-extrabold text-[#A80D1B]">
                            {money(
                              outstanding,
                              invoiceCurrencies[0] || "UGX"
                            )}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm font-semibold text-[#A80D1B]">
                            Multiple currencies — see invoice list
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">
                          Recent invoices
                        </h4>
                        <Link
                          href="/workspace/finance/invoices"
                          className="text-xs font-bold text-[#F3192D] hover:text-[#A80D1B]"
                        >
                          View all
                        </Link>
                      </div>

                      {customerInvoices.length ? (
                        <div className="space-y-2">
                          {customerInvoices.slice(0, 4).map((invoice) => {
                            const invoiceStatus = String(invoice.status || "draft").toLowerCase();
                            const isCancelledInvoice = ["void", "cancelled", "canceled"].includes(invoiceStatus);
                            const balance = isCancelledInvoice
                              ? 0
                              : Math.max(
                                  0,
                                  Number(invoice.total || 0) -
                                    Number(invoice.amount_paid || 0)
                                );

                            const status = invoiceStatus.replace(/_/g, " ");

                            return (
                              <div
                                key={invoice.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {invoice.invoice_number || "Invoice"}
                                  </p>
                                  <p className="mt-1 text-xs capitalize text-slate-500">
                                    {status} · {dateLabel(invoice.issue_date)}
                                  </p>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className="text-sm font-bold text-slate-800">
                                    {money(
                                      Number(invoice.total || 0),
                                      invoice.currency || "UGX"
                                    )}
                                  </p>
                                  <p
                                    className={`mt-1 text-[11px] font-semibold ${
                                      balance > 0
                                        ? "text-amber-700"
                                        : "text-emerald-700"
                                    }`}
                                  >
                                    {balance > 0
                                      ? `Due ${money(
                                          balance,
                                          invoice.currency || "UGX"
                                        )}`
                                      : "Paid"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                          <FileText
                            className="mx-auto text-slate-300"
                            size={22}
                          />
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            No linked invoices found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Invoices will appear here when they are linked to
                            this customer.
                          </p>
                          <Link
                            href="/workspace/finance/invoices"
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#F3192D]"
                          >
                            Go to invoices <ChevronRight size={14} />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Users className="mx-auto text-slate-300" size={28} />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      No customer selected
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Select a customer from the directory to view details.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Add customer form */}
      {showForm && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-customer-title"
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-bold tracking-wider text-[#F3192D]">
                  CUSTOMER RECORD
                </p>
                <h2
                  id="add-customer-title"
                  className="mt-1 text-xl font-extrabold text-slate-900"
                >
                  {editingCustomerId ? "Edit customer" : "Add a customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter the details you have. You can leave optional fields
                  blank.
                </p>
              </div>

              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingCustomerId(null); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={createCustomer}
              className="space-y-5 p-5 sm:p-7"
            >
              <div>
                <label
                  htmlFor="customer-name"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Customer / company name{" "}
                  <span className="text-[#F3192D]">*</span>
                </label>
                <input
                  id="customer-name"
                  required
                  minLength={2}
                  maxLength={160}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Acme Uganda Ltd"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="customer-phone"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Phone number
                  </label>
                  <input
                    id="customer-phone"
                    type="tel"
                    maxLength={40}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="e.g. +256 7..."
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-email"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="customer-address"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Billing address
                </label>
                <textarea
                  id="customer-address"
                  rows={2}
                  maxLength={500}
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="Street, city, country"
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-tin"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Tax Identification Number (TIN)
                </label>
                <input
                  id="customer-tin"
                  maxLength={100}
                  value={taxNumber}
                  onChange={(event) => setTaxNumber(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-[#F3192D] focus:ring-4 focus:ring-[#FDE8EA]"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSupplier}
                    onChange={(event) => setIsSupplier(event.target.checked)}
                    className="mt-1 h-4 w-4 accent-[#F3192D]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      This contact is also a supplier
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Enable this if the customer also supplies goods or
                      services to your business. The same contact can be used
                      for both customer and supplier transactions.
                    </span>
                  </span>
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F3192D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#CF1022] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle className="animate-spin" size={16} />
                  )}
                  {saving ? (editingCustomerId ? "Updating customer..." : "Saving customer...") : (editingCustomerId ? "Save changes" : "Save customer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
