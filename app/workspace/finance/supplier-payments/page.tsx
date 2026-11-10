
"use client";

import "../finance.css";
import Link from "next/link";
import {
  CalendarDays,
  CreditCard,
  FileBarChart,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  UsersRound,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

const financeNavigation = [
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

function FinancePageSidebar({ activeHref }: { activeHref: string }) {
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
            <span className="block font-bold tracking-wide">JOHDEN</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Business Consultancy &amp; Finance
            </span>
          </span>
        </Link>
        <div className="px-4 pb-2 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">
          Workspace
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {financeNavigation.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
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
        {financeNavigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              item.href === activeHref
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

type Supplier = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  expense_date: string;
  description: string;
  supplier_contact_id?: string | null;
  supplier_name?: string | null;
  amount: number;
  currency: string;
};

type CustomerInvoice = {
  id: string;
  invoice_number: string;
  contact_id?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  currency: string;
  total: number;
  amount_paid?: number | null;
  status?: string | null;
  business_contacts?: { name?: string | null } | null;
};

type Payment = {
  id: string;
  supplier_contact_id: string;
  supplier_name?: string | null;
  expense_id?: string | null;
  expense_description?: string | null;
  invoice_id?: string | null;
  invoice_number?: string | null;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_reference?: string | null;
  notes?: string | null;
};

const methods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const money = (amount: number, currency = "UGX") =>
  `${currency} ${Number(amount || 0).toLocaleString("en-UG", {
    maximumFractionDigits: 2,
  })}`;

const invoiceLabel = (invoice: CustomerInvoice) => {
  const customer = invoice.business_contacts?.name || "Customer";
  const status = invoice.status ? ` · ${invoice.status}` : "";
  return `${invoice.invoice_number} · ${customer} · ${money(Number(invoice.total), invoice.currency)}${status}`;
};

export default function SupplierPaymentsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    supplier_contact_id: "",
    expense_id: "",
    invoice_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    currency: "UGX",
    payment_method: "bank_transfer",
    payment_reference: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const [sr, er, ir, pr] = await Promise.all([
      fetch("/api/saas/suppliers", { cache: "no-store" }),
      fetch("/api/saas/expenses", { cache: "no-store" }),
      fetch("/api/saas/invoices", { cache: "no-store" }),
      fetch("/api/saas/supplier-payments", { cache: "no-store" }),
    ]);

    const [sd, ed, id, pd] = await Promise.all([
      sr.json(),
      er.json(),
      ir.json(),
      pr.json(),
    ]);

    if (!sr.ok || !er.ok || !ir.ok || !pr.ok) {
      throw new Error(
        sd.error || ed.error || id.error || pd.error || "Unable to load supplier payment records.",
      );
    }

    setSuppliers(sd.suppliers || []);
    setExpenses(ed.expenses || []);
    setInvoices(id.invoices || []);
    setPayments(pd.payments || []);
    setMigrationRequired(Boolean(pd.migration_required));
  }, []);

  useEffect(() => {
    load().catch((e) =>
      setMessage(e instanceof Error ? e.message : "Unable to load records."),
    );
  }, [load]);

  const linkedExpenses = useMemo(
    () => expenses.filter((e) => e.supplier_contact_id === form.supplier_contact_id),
    [expenses, form.supplier_contact_id],
  );

  const selectedExpense = expenses.find((e) => e.id === form.expense_id);
  const selectedInvoice = invoices.find((i) => i.id === form.invoice_id);

  const availableInvoices = useMemo(
    () =>
      invoices.filter(
        (i) => !["void", "cancelled"].includes((i.status || "").toLowerCase()),
      ),
    [invoices],
  );

  const filtered = payments.filter((p) =>
    `${p.supplier_name || ""} ${p.expense_description || ""} ${
      p.invoice_number || ""
    } ${p.payment_reference || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const total = filtered.reduce((n, p) => n + Number(p.amount || 0), 0);

  function chooseSupplier(id: string) {
    setForm((v) => ({
      ...v,
      supplier_contact_id: id,
      expense_id: "",
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const r = await fetch("/api/saas/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          expense_id: form.expense_id || null,
          invoice_id: form.invoice_id || null,
          amount: Number(form.amount),
          payment_reference: form.payment_reference || null,
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save supplier payment.");

      setMessage("Supplier payment recorded successfully.");
      setForm((s) => ({
        ...s,
        expense_id: "",
        invoice_id: "",
        amount: "",
        payment_reference: "",
        notes: "",
      }));

      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save supplier payment.");
    } finally {
      setBusy(false);
    }
  }

  const balances = useMemo(
    () =>
      expenses
        .filter((e) => e.supplier_contact_id)
        .map((e) => {
          const paid = payments
            .filter((p) => p.expense_id === e.id)
            .reduce((n, p) => n + Number(p.amount || 0), 0);

          return {
            ...e,
            paid,
            balance: Math.max(0, Number(e.amount) - paid),
          };
        })
        .filter((e) => e.balance > 0),
    [expenses, payments],
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <FinancePageSidebar activeHref="/workspace/finance/supplier-payments" />

      <main className="jbcs-finance-page md:ml-[264px] jbcs-finance-consistent-main">
        <div className="jbcs-finance-top">
          <Link href="/workspace/finance">← Finance overview</Link>
          <span>JOHDEN BUSINESS SUITE</span>
        </div>

        <header className="jbcs-finance-heading">
          <div>
            <p className="jbcs-eyebrow">FINANCE / ACCOUNTS PAYABLE</p>
            <h1>Supplier payments</h1>
            <p>
              Record supplier payments against supplier bills, customer invoices
              or jobs, or record standalone payments.
            </p>
          </div>
          <div className="jbcs-page-actions">
            <button
              type="button"
              className="jbcs-primary-button"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Close form" : "Record supplier payment"}
            </button>
          </div>
        </header>

        <div className="jbcs-stat-grid">
          <article>
            <span>Payments shown</span>
            <strong>{filtered.length}</strong>
            <small>Recorded supplier payments</small>
          </article>
          <article>
            <span>Total shown</span>
            <strong>{money(total)}</strong>
            <small>Mixed currencies are not converted</small>
          </article>
          <article>
            <span>Expenses with balances</span>
            <strong>{balances.length}</strong>
            <small>Supplier-linked expenses with outstanding amounts</small>
          </article>
        </div>

        <div className="jbcs-finance-columns">
          {showForm && (
            <div className="fixed inset-0 z-50 flex justify-end overflow-y-auto bg-slate-950/40" role="dialog" aria-modal="true" aria-labelledby="supplier-payment-entry-title" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <section className="jbcs-panel jbcs-entry-panel min-h-screen w-full max-w-2xl overflow-y-auto rounded-l-2xl bg-white shadow-2xl">
              <div className="jbcs-panel-heading">
                <div>
                  <p className="jbcs-eyebrow">PAYMENT ENTRY</p>
                  <h2 id="supplier-payment-entry-title">Record a supplier payment</h2>
                </div>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => setShowForm(false)}>Close</button>
              </div>

              {migrationRequired && (
                <p className="jbcs-message">
                  Supplier payment setup is not active. Check the database
                  migration and API configuration before recording payments.
                </p>
              )}

              <form className="jbcs-form-grid" onSubmit={save}>
                <label className="jbcs-span-2">
                  Supplier
                  <select
                    required
                    value={form.supplier_contact_id}
                    onChange={(e) => chooseSupplier(e.target.value)}
                  >
                    <option value="">Choose supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="jbcs-span-2">
                  Supplier bill / expense (optional)
                  <select
                    value={form.expense_id}
                    onChange={(e) => {
                      const x = expenses.find((v) => v.id === e.target.value);
                      setForm((s) => ({
                        ...s,
                        expense_id: e.target.value,
                        currency: x?.currency || s.currency,
                      }));
                    }}
                  >
                    <option value="">Not linked to a supplier expense</option>
                    {linkedExpenses.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.expense_date} · {x.description} ·{" "}
                        {money(Number(x.amount), x.currency)}
                      </option>
                    ))}
                  </select>
                  <small className="jbcs-help">
                    Only expenses assigned to the selected supplier are listed.
                    Linking a bill enables its outstanding balance checks.
                  </small>
                </label>

                <label className="jbcs-span-2">
                  Related customer invoice / job (optional)
                  <select
                    value={form.invoice_id}
                    onChange={(e) => setForm((s) => ({ ...s, invoice_id: e.target.value }))}
                  >
                    <option value="">No customer invoice linked</option>
                    {availableInvoices.map((i) => (
                      <option key={i.id} value={i.id}>
                        {invoiceLabel(i)}
                      </option>
                    ))}
                  </select>
                  <small className="jbcs-help">
                    Link the customer invoice for the job this supplier is
                    helping to deliver. This records the relationship and does
                    not change the customer invoice balance.
                  </small>
                </label>

                {selectedExpense && (
                  <div className="jbcs-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <strong>Selected supplier expense</strong>
                    <p className="mt-1">
                      Total: {money(Number(selectedExpense.amount), selectedExpense.currency)}
                    </p>
                    <p>
                      Previously paid:{" "}
                      {money(
                        payments
                          .filter((p) => p.expense_id === selectedExpense.id)
                          .reduce((n, p) => n + Number(p.amount || 0), 0),
                        selectedExpense.currency,
                      )}
                    </p>
                  </div>
                )}

                {selectedInvoice && (
                  <div className="jbcs-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                    <strong>Related customer invoice</strong>
                    <p className="mt-1">
                      {selectedInvoice.invoice_number} ·{" "}
                      {selectedInvoice.business_contacts?.name || "Customer"}
                    </p>
                    <p>
                      Invoice total:{" "}
                      {money(Number(selectedInvoice.total), selectedInvoice.currency)}
                    </p>
                    <p className="text-slate-500">
                      This link is for job tracking only.
                    </p>
                  </div>
                )}

                <label>
                  Payment date
                  <input
                    type="date"
                    required
                    value={form.payment_date}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, payment_date: e.target.value }))
                    }
                  />
                </label>

                <label>
                  Amount
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                  />
                </label>

                <label>
                  Currency
                  <input
                    required
                    minLength={3}
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))
                    }
                  />
                </label>

                <label>
                  Payment method
                  <select
                    required
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, payment_method: e.target.value }))
                    }
                  >
                    {methods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="jbcs-span-2">
                  Reference (optional)
                  <input
                    maxLength={150}
                    placeholder="Bank transaction / mobile money reference"
                    value={form.payment_reference}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, payment_reference: e.target.value }))
                    }
                  />
                </label>

                <label className="jbcs-span-2">
                  Notes
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={form.notes}
                    onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                </label>

                <div className="jbcs-span-2">
                  <button
                    className="jbcs-primary-button"
                    disabled={busy || !suppliers.length || migrationRequired}
                  >
                    {busy ? "Saving…" : "Record payment"}
                  </button>
                </div>
              </form>

              {message && (
                <p
                  role="status"
                  className={
                    message.toLowerCase().includes("success")
                      ? "jbcs-message success"
                      : "jbcs-message"
                  }
                >
                  {message}
                </p>
              )}
            </section>
            </div>
          )}

          <section className="jbcs-panel jbcs-register-panel">
            <div className="jbcs-panel-heading">
              <div>
                <p className="jbcs-eyebrow">ACCOUNTS PAYABLE</p>
                <h2>Outstanding expense balances</h2>
              </div>
            </div>

            <div className="jbcs-table-wrap">
              <table className="jbcs-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Expense total</th>
                    <th>Paid</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>{x.description}</strong>
                        <small>
                          {x.supplier_name ||
                            suppliers.find((s) => s.id === x.supplier_contact_id)?.name ||
                            "Supplier"}{" "}
                          · {x.expense_date}
                        </small>
                      </td>
                      <td>{money(Number(x.amount), x.currency)}</td>
                      <td>{money(x.paid, x.currency)}</td>
                      <td className="jbcs-amount">{money(x.balance, x.currency)}</td>
                    </tr>
                  ))}
                  {!balances.length && (
                    <tr>
                      <td colSpan={4} className="jbcs-empty">
                        No outstanding supplier-linked expenses found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="jbcs-panel jbcs-history-panel jbcs-register-panel">
          <div className="jbcs-panel-heading">
            <div>
              <p className="jbcs-eyebrow">PAYMENT HISTORY</p>
              <h2>Recent supplier payments</h2>
            </div>
            <input
              className="jbcs-search"
              placeholder="Search supplier, expense, invoice or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="jbcs-table-wrap">
            <table className="jbcs-table">
              <thead>
                <tr>
                  <th>Date / supplier</th>
                  <th>Supplier bill / expense</th>
                  <th>Customer invoice / job</th>
                  <th>Method / reference</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.supplier_name || "Supplier"}</strong>
                      <small>{p.payment_date}</small>
                    </td>
                    <td>{p.expense_description || "Not linked to an expense"}</td>
                    <td>{p.invoice_number || "No customer invoice linked"}</td>
                    <td>
                      {p.payment_method.replaceAll("_", " ")}
                      <small>{p.payment_reference || "—"}</small>
                    </td>
                    <td className="jbcs-amount">
                      {money(Number(p.amount), p.currency)}
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="jbcs-empty">
                      No supplier payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
