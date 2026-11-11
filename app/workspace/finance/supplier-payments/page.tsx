
"use client";

import FinanceSidebar from "@/components/finance/FinanceSidebar";

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
  return <FinanceSidebar activeHref={activeHref} />;
}type Supplier = {
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

const today = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); };

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
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    supplier_contact_id: "",
    expense_id: "",
    invoice_id: "",
    payment_date: today(),
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
  const selectedPayment = filtered.find((p) => p.id === selectedPaymentId) || filtered[0] || null;

  function chooseSupplier(id: string) {
    setForm((v) => ({
      ...v,
      supplier_contact_id: id,
      expense_id: "",
    }));
  }

  function editSelectedPayment(payment: Payment) {
    setEditingPaymentId(payment.id);
    setForm({
      supplier_contact_id: payment.supplier_contact_id,
      expense_id: payment.expense_id || "",
      invoice_id: payment.invoice_id || "",
      payment_date: payment.payment_date,
      amount: String(payment.amount),
      currency: payment.currency || "UGX",
      payment_method: payment.payment_method || "bank_transfer",
      payment_reference: payment.payment_reference || "",
      notes: payment.notes || "",
    });
    setMessage("");
    setShowForm(true);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const amountValue = Number(form.amount);
    if (!form.supplier_contact_id) {
      setMessage("Choose a supplier before recording this payment.");
      return;
    }
    if (!form.payment_date) {
      setMessage("Choose the payment date.");
      return;
    }
    if (form.payment_date > today()) {
      setMessage("Payment date cannot be in the future.");
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setMessage("Payment amount must be a valid amount greater than zero.");
      return;
    }
    if (!form.currency.trim()) {
      setMessage("Choose the payment currency.");
      return;
    }
    setBusy(true);

    try {
      const r = await fetch("/api/saas/supplier-payments", {
        method: editingPaymentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(editingPaymentId ? { id: editingPaymentId } : {}),
          expense_id: form.expense_id || null,
          invoice_id: form.invoice_id || null,
          amount: amountValue,
          currency: form.currency.trim().toUpperCase(),
          payment_reference: form.payment_reference.trim() || null,
        }),
      });

      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save supplier payment.");

      setMessage(editingPaymentId ? "Supplier payment updated successfully." : "Supplier payment recorded successfully.");
      setShowForm(false);
      setEditingPaymentId(null);
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
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  setEditingPaymentId(null);
                } else {
                  setEditingPaymentId(null);
                  setForm({ supplier_contact_id: "", expense_id: "", invoice_id: "", payment_date: today(), amount: "", currency: "UGX", payment_method: "bank_transfer", payment_reference: "", notes: "" });
                  setShowForm(true);
                }
              }}
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
                  <h2 id="supplier-payment-entry-title">{editingPaymentId ? "Edit supplier payment" : "Record a supplier payment"}</h2>
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
                    max={today()}
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
                    {busy ? "Saving…" : editingPaymentId ? "Save changes" : "Record payment"}
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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">All Supplier Payments <span className="text-sm font-medium text-slate-400">({filtered.length})</span></h2><p className="mt-1 text-xs text-slate-500">Select a payment to review its supplier, allocation and reference.</p></div><input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-sm" placeholder="Search supplier, expense, invoice or reference" value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="grid min-h-[600px] grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]"><aside className="border-b border-slate-200 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier payment register</span><span className="text-xs text-slate-400">{filtered.length} records</span></div><div className="max-h-[700px] overflow-y-auto">{filtered.length===0?<p className="p-6 text-sm text-slate-500">No supplier payments found.</p>:filtered.map(p=><button type="button" key={p.id} onClick={()=>setSelectedPaymentId(p.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left ${selectedPayment?.id===p.id?"bg-rose-50/80 ring-1 ring-inset ring-rose-100":"hover:bg-slate-50"}`}><span className="flex items-start justify-between gap-3"><span className="truncate text-sm font-semibold">{p.supplier_name||"Supplier"}</span><span className="whitespace-nowrap text-sm font-bold">{money(Number(p.amount),p.currency)}</span></span><span className="mt-1 block text-xs text-slate-500">{p.payment_date}</span><span className="mt-2 block truncate text-xs text-blue-600">{p.expense_description||p.invoice_number||p.payment_reference||"Standalone supplier payment"}</span></button>)}</div></aside><div className="min-w-0 bg-slate-50/70">{!selectedPayment?<div className="flex min-h-[450px] items-center justify-center p-8 text-sm text-slate-500">Select a supplier payment to view details.</div>:<><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4"><div><p className="text-xs text-slate-500">Selected supplier payment</p><h2 className="mt-0.5 text-xl font-bold">{selectedPayment.supplier_name||"Supplier payment"}</h2><p className="mt-1 text-xs text-slate-500">{selectedPayment.payment_date}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>window.print()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">PDF / Print</button><button type="button" onClick={()=>editSelectedPayment(selectedPayment)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">Edit</button></div></div><div className="m-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount paid</p><p className="mt-2 text-2xl font-bold">{money(Number(selectedPayment.amount),selectedPayment.currency)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment method</p><p className="mt-2 font-semibold capitalize">{selectedPayment.payment_method.replaceAll("_"," ")}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</p><p className="mt-2 font-semibold">{selectedPayment.supplier_name||"—"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment reference</p><p className="mt-2 font-semibold">{selectedPayment.payment_reference||"—"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier bill / expense</p><p className="mt-2 font-semibold">{selectedPayment.expense_description||"Not linked to an expense"}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer invoice / job</p><p className="mt-2 font-semibold">{selectedPayment.invoice_number||"No customer invoice linked"}</p></div><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedPayment.notes||"No notes recorded."}</p></div></div></div></>}</div></div><div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400">Total shown: {money(total)}. Mixed currencies are not converted.</div></section>
      </main>
    </div>
  );
}
