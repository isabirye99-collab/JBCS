
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InvoiceForm from "@/components/finance/InvoiceForm";
import QuoteForm from "@/components/finance/QuoteForm";
import FinanceOperations from "@/components/finance/FinanceOperations";
import RecurringFinance from "@/components/finance/RecurringFinance";

type NavItem = { label: string; icon: string };

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_number: string | null;
  notes: string | null;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  contact_id: string | null;
  issue_date: string;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
  business_contacts?: { name: string } | null;
};

type Quote = {
  id: string;
  quote_number: string;
  contact_id: string | null;
  issue_date: string;
  valid_until: string | null;
  currency: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: string;
  notes: string | null;
  created_at: string;
  business_contacts?: { name: string } | null;
};

const nav: NavItem[] = [
  { label: "Overview", icon: "▦" },
  { label: "Invoices", icon: "▤" },
  { label: "Quotes", icon: "▧" },
  { label: "Customers", icon: "♙" },
  { label: "Expenses", icon: "↗" },
  { label: "Recurring", icon: "⟳" },
  { label: "Payments", icon: "⇄" },
  { label: "Reports", icon: "▥" },
];

const emptyCustomer = {
  name: "",
  email: "",
  phone: "",
  address: "",
  tax_number: "",
  notes: "",
};

const money = (amount: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: /^[A-Z]{3}$/.test(currency) ? currency : "UGX",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const dateLabel = (date?: string | null) =>
  date
    ? new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function FinanceDashboard() {
  const [active, setActive] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [contactType, setContactType] = useState<"client" | "supplier">("client");
  const [notice, setNotice] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [customerError, setCustomerError] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const [quoteError, setQuoteError] = useState("");

  const [customerForm, setCustomerForm] = useState(emptyCustomer);

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomerError("");

    try {
      const response = await fetch(`/api/finance/customers?type=${contactType}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load customers.");
      }

      setCustomers(Array.isArray(data.customers) ? data.customers : []);
    } catch (err) {
      setCustomerError(
        err instanceof Error ? err.message : "Unable to load customers."
      );
    } finally {
      setLoadingCustomers(false);
    }
  }, [contactType]);

  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    setInvoiceError("");

    try {
      const response = await fetch("/api/finance/invoices", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load invoices.");
      }

      setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
    } catch (err) {
      setInvoiceError(
        err instanceof Error ? err.message : "Unable to load invoices."
      );
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    setLoadingQuotes(true);
    setQuoteError("");

    try {
      const response = await fetch("/api/finance/quotes", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load quotations.");
      }

      setQuotes(Array.isArray(data.quotes) ? data.quotes : []);
    } catch (err) {
      setQuoteError(
        err instanceof Error ? err.message : "Unable to load quotations."
      );
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
    void loadInvoices();
    void loadQuotes();
  }, [loadCustomers, loadInvoices, loadQuotes]);

  async function saveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingCustomer(true);
    setCustomerError("");
    setNotice("");

    try {
      const response = await fetch("/api/finance/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customerForm, contact_type: contactType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save customer.");
      }

      setCustomerForm(emptyCustomer);
      setShowCreate(false);
      setNotice(`${contactType === "supplier" ? "Supplier" : "Customer"} "${data.customer.name}" was saved successfully.`);
      await loadCustomers();
    } catch (err) {
      setCustomerError(
        err instanceof Error ? err.message : "Unable to save customer."
      );
    } finally {
      setSavingCustomer(false);
    }
  }

  function changeSection(section: string) {
    setActive(section);
    setSearch("");
    setNotice("");
    setCustomerError("");
    setInvoiceError("");
    setQuoteError("");

    if (section === "Customers") void loadCustomers();
    if (section === "Invoices" || section === "Overview") {
      void loadInvoices();
    }
    if (section === "Quotes") void loadQuotes();
  }

  const createLabel =
    active === "Overview" || active === "Invoices"
      ? "invoice"
      : active === "Quotes"
        ? "quote"
        : active === "Customers"
          ? contactType === "supplier" ? "supplier" : "customer"
          : active === "Expenses"
            ? "expense"
            : active === "Payments"
              ? "payment"
              : "report";

  const filteredCustomers = useMemo(
    () =>
      customers.filter((customer) =>
        [
          customer.name,
          customer.email ?? "",
          customer.phone ?? "",
          customer.address ?? "",
          customer.tax_number ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [customers, search]
  );

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        [
          invoice.invoice_number,
          invoice.business_contacts?.name ?? "",
          invoice.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [invoices, search]
  );

  const filteredQuotes = useMemo(
    () =>
      quotes.filter((quote) =>
        [
          quote.quote_number,
          quote.business_contacts?.name ?? "",
          quote.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [quotes, search]
  );

  // Keep currencies separate: adding UGX, USD and EUR into one number
  // would produce a misleading financial total.
  const outstandingByCurrency = invoices.reduce<Record<string, number>>((totals, invoice) => {
    const currency = /^[A-Z]{3}$/.test(invoice.currency) ? invoice.currency : "UGX";
    totals[currency] = (totals[currency] || 0) + Math.max(0, Number(invoice.total) - Number(invoice.amount_paid));
    return totals;
  }, {});

  const paidByCurrency = invoices.reduce<Record<string, number>>((totals, invoice) => {
    const currency = /^[A-Z]{3}$/.test(invoice.currency) ? invoice.currency : "UGX";
    totals[currency] = (totals[currency] || 0) + Number(invoice.amount_paid || 0);
    return totals;
  }, {});

  const moneyByCurrency = (totals: Record<string, number>) => {
    const entries = Object.entries(totals).filter(([, amount]) => amount !== 0);
    return entries.length ? entries.map(([currency, amount]) => money(amount, currency)).join(" · ") : money(0, "UGX");
  };

  return (
    <main className="finance-app">
      <aside className="finance-sidebar">
        <a className="finance-brand" href="/" aria-label="Johden home">
          <img
            src="/johden-logo.svg"
            alt="Johden Business Consultancy Services"
          />
        </a>

        <div className="finance-workspace">
          <span className="workspace-mark">J</span>
          <span>
            <b>Johden Finance</b>
            <small>Business workspace</small>
          </span>
          <span className="workspace-chevron">⌄</span>
        </div>

        <p className="finance-nav-label">WORKSPACE</p>

        <nav className="finance-nav" aria-label="Finance navigation">
          {nav.map((item) => (
            <button
              key={item.label}
              className={
                active === item.label
                  ? "finance-nav-item active"
                  : "finance-nav-item"
              }
              onClick={() => changeSection(item.label)}
            >
              <span className="finance-nav-icon">{item.icon}</span>
              {item.label}

              {item.label === "Invoices" && (
                <span className="nav-count">{invoices.length}</span>
              )}

              {item.label === "Quotes" && (
                <span className="nav-count">{quotes.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="finance-sidebar-bottom">
          <div className="finance-help-icon">?</div>
          <div>
            <b>Need a hand?</b>
            <small>Contact your workspace admin</small>
          </div>
        </div>

        <a className="finance-back-link" href="/">
          ← Back to Johden website
        </a>
      </aside>

      <section className="finance-main">
        <header className="finance-topbar">
          <div className="finance-breadcrumb">
            Johden Finance <span>/</span> {active}
          </div>

          <div className="finance-top-actions">
            <span className="finance-currency">
              UGX <span>⌄</span>
            </span>
            <button
              className="finance-icon-button"
              aria-label="Notifications"
              onClick={() =>
                setNotice("You are all caught up on notifications.")
              }
            >
              ♧
            </button>
            <span className="finance-avatar">J</span>
            <div className="finance-user">
              <b>Johden Admin</b>
              <small>Administrator</small>
            </div>
          </div>
        </header>

        <div className="finance-content">
          <div className="finance-page-heading">
            <div>
              <p className="finance-eyebrow">FINANCIAL CONTROL CENTRE</p>
              <h1>
                {active === "Overview" ? "Good afternoon, Johden" : active}
              </h1>
              <p className="finance-subtitle">
                {active === "Overview"
                  ? "Your business finances at a glance."
                  : `Manage your ${active.toLowerCase()} in one organised workspace.`}
              </p>
            </div>

            <button
              className="finance-primary-button"
              onClick={() => {
                setCustomerError("");
                setInvoiceError("");
                setQuoteError("");
                setNotice("");
                if (active === "Expenses" || active === "Payments" || active === "Reports") {
                  setShowCreate(false);
                  return;
                }
                setShowCreate(true);
              }}
            >
              + New {createLabel}
            </button>
          </div>

          {notice && (
            <div className="finance-notice" role="status">
              {notice}
            </div>
          )}

          {active === "Overview" ? (
            <>
              <div className="finance-stat-grid">
                <article className="finance-stat-card">
                  <div className="finance-stat-top">
                    <span>Invoices created</span>
                    <span className="finance-stat-icon red">▤</span>
                  </div>
                  <strong>{invoices.length}</strong>
                  <p>
                    <span className="finance-muted">Saved invoice records</span>
                  </p>
                </article>

                <article className="finance-stat-card">
                  <div className="finance-stat-top">
                    <span>Outstanding</span>
                    <span className="finance-stat-icon orange">◷</span>
                  </div>
                  <strong>{moneyByCurrency(outstandingByCurrency)}</strong>
                  <p>
                    <span className="finance-muted">
                      Unpaid invoice balance
                    </span>
                  </p>
                </article>

                <article className="finance-stat-card">
                  <div className="finance-stat-top">
                    <span>Payments received</span>
                    <span className="finance-stat-icon green">↗</span>
                  </div>
                  <strong>{moneyByCurrency(paidByCurrency)}</strong>
                  <p>
                    <span className="finance-muted">
                      Recorded against invoices
                    </span>
                  </p>
                </article>

                <article className="finance-stat-card">
                  <div className="finance-stat-top">
                    <span>Customers</span>
                    <span className="finance-stat-icon dark">♙</span>
                  </div>
                  <strong>{customers.length}</strong>
                  <p>
                    <span className="finance-muted">
                      Saved customer records
                    </span>
                  </p>
                </article>
              </div>

              <article className="finance-panel finance-recent-panel">
                <div className="finance-panel-heading">
                  <div>
                    <h2>Recent invoices</h2>
                    <p>Records retrieved from your finance database</p>
                  </div>
                  <button
                    className="finance-text-button"
                    onClick={() => changeSection("Invoices")}
                  >
                    All invoices →
                  </button>
                </div>

                {invoiceError && (
                  <div className="finance-notice" role="alert">
                    {invoiceError}{" "}
                    <button
                      className="finance-text-button"
                      onClick={() => void loadInvoices()}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {loadingInvoices ? (
                  <p className="finance-empty">Loading invoices…</p>
                ) : (
                  <InvoiceTable rows={invoices.slice(0, 5)} />
                )}
              </article>

              <article className="finance-panel finance-recent-panel">
                <div className="finance-panel-heading">
                  <div>
                    <h2>Recent quotations</h2>
                    <p>Track quotations prepared for your customers</p>
                  </div>
                  <button
                    className="finance-text-button"
                    onClick={() => changeSection("Quotes")}
                  >
                    All quotations →
                  </button>
                </div>

                {quoteError && (
                  <div className="finance-notice" role="alert">
                    {quoteError}{" "}
                    <button
                      className="finance-text-button"
                      onClick={() => void loadQuotes()}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {loadingQuotes ? (
                  <p className="finance-empty">Loading quotations…</p>
                ) : (
                  <QuoteTable rows={quotes.slice(0, 5)} />
                )}
              </article>

              <p className="finance-demo-note">
                Figures are calculated from saved invoice and customer
                records. Expenses and payments will be connected in the next
                development stages.
              </p>
            </>
          ) : active === "Recurring" ? (
            <RecurringFinance onNotice={setNotice} />
          ) : (
            <article className="finance-panel finance-table-panel">
              <div className="finance-panel-heading">
                <div>
                  <h2>{active} overview</h2>
                  <p>
                    {active === "Customers"
                      ? "Manage saved customer records."
                      : active === "Invoices"
                        ? "Create and track invoices saved in the database."
                        : active === "Quotes"
                          ? "Prepare and track quotations saved in the database."
                          : "This module will be connected to database records next."}
                  </p>
                </div>

                {active === "Customers" && (
                  <select
                    className="finance-search"
                    aria-label="Contact type"
                    value={contactType}
                    onChange={(event) => {
                      setContactType(event.target.value as "client" | "supplier");
                      setSearch("");
                    }}
                  >
                    <option value="client">Customers / Clients</option>
                    <option value="supplier">Suppliers</option>
                  </select>
                )}
                <input
                  className="finance-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={active === "Customers" ? "Search contacts by name, email or phone..." : active === "Quotes" ? "Search quotation or customer..." : "Search records..."}
                />
              </div>

              {active === "Invoices" ? (
                <>
                  {invoiceError && (
                    <div className="finance-notice" role="alert">
                      {invoiceError}{" "}
                      <button
                        className="finance-text-button"
                        onClick={() => void loadInvoices()}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {loadingInvoices ? (
                    <div className="finance-empty">Loading invoices…</div>
                  ) : (
                    <InvoiceTable rows={filteredInvoices} />
                  )}
                </>
              ) : active === "Quotes" ? (
                <>
                  {quoteError && (
                    <div className="finance-notice" role="alert">
                      {quoteError}{" "}
                      <button
                        className="finance-text-button"
                        onClick={() => void loadQuotes()}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {loadingQuotes ? (
                    <div className="finance-empty">
                      Loading quotations…
                    </div>
                  ) : (
                    <QuoteTable rows={filteredQuotes} />
                  )}
                </>
              ) : active === "Customers" ? (
                <>
                  {customerError && (
                    <div className="finance-notice" role="alert">
                      {customerError}{" "}
                      <button
                        className="finance-text-button"
                        onClick={() => void loadCustomers()}
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {loadingCustomers ? (
                    <div className="finance-empty">Loading customers…</div>
                  ) : filteredCustomers.length ? (
                    <div className="finance-table-wrap">
                      <table className="finance-table">
                        <thead>
                          <tr>
                            <th>{contactType === "supplier" ? "SUPPLIER" : "CUSTOMER"}</th>
                            <th>EMAIL</th>
                            <th>TELEPHONE</th>
                            <th>ADDRESS</th>
                            <th>TAX NUMBER</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCustomers.map((customer) => (
                            <tr key={customer.id}>
                              <td>
                                <b>{customer.name}</b>
                              </td>
                              <td>{customer.email || "—"}</td>
                              <td>{customer.phone || "—"}</td>
                              <td>{customer.address || "—"}</td>
                              <td>{customer.tax_number || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="finance-empty">
                      <div className="finance-empty-icon">♙</div>
                      <h3>
                        {search ? `No matching ${contactType === "supplier" ? "suppliers" : "customers"}` : `No ${contactType === "supplier" ? "suppliers" : "customers"} yet`}
                      </h3>
                      <p>
                        {search
                          ? "Try another search."
                          : contactType === "supplier" ? "Add a supplier to link it to business expenses." : "Add a customer before preparing invoices."}
                      </p>
                      <button
                        className="finance-primary-button"
                        onClick={() => setShowCreate(true)}
                      >
                        {`+ Add ${contactType === "supplier" ? "supplier" : "customer"}`}
                      </button>
                    </div>
                  )}
                </>
              ) : active === "Expenses" || active === "Payments" || active === "Reports" ? (
                <FinanceOperations section={active} onNotice={setNotice} />
              ) : (
                <div className="finance-empty">
                  <h3>{active} workspace</h3>
                  <p>Select a supported finance module.</p>
                </div>
              )}
            </article>
          )}

          <footer className="finance-footer">
            <span>
              © {new Date().getFullYear()} Johden Business Consultancy Services
            </span>
            <span>Designed for clarity. Built for growth.</span>
          </footer>
        </div>
      </section>

      {showCreate && (
        <div
          className="finance-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <section
            className="finance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-title"
          >
            <button
              type="button"
              className="finance-modal-close"
              onClick={() => setShowCreate(false)}
              aria-label="Close"
            >
              ×
            </button>

            <p className="finance-eyebrow">JOHDEN FINANCE</p>
            <h2 id="create-title">
              {active === "Customers"
                ? `Add a ${contactType === "supplier" ? "supplier" : "customer"}`
                : active === "Quotes"
                  ? "Create a quotation"
                  : `Create ${createLabel}`}
            </h2>

            {active === "Customers" ? (
              <form onSubmit={saveCustomer}>
                <label>
                  {contactType === "supplier" ? "Supplier name *" : "Customer name *"}
                  <input
                    required
                    maxLength={160}
                    value={customerForm.name}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        name: event.target.value,
                      })
                    }
                    placeholder="Company or individual name"
                  />
                </label>

                <label>
                  Email address
                  <input
                    type="email"
                    maxLength={254}
                    value={customerForm.email}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        email: event.target.value,
                      })
                    }
                    placeholder="customer@example.com"
                  />
                </label>

                <label>
                  Telephone number
                  <input
                    type="tel"
                    maxLength={40}
                    value={customerForm.phone}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        phone: event.target.value,
                      })
                    }
                    placeholder="+256..."
                  />
                </label>

                <label>
                  Address
                  <input
                    maxLength={500}
                    value={customerForm.address}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        address: event.target.value,
                      })
                    }
                    placeholder="Business or postal address"
                  />
                </label>

                <label>
                  Tax identification number
                  <input
                    maxLength={100}
                    value={customerForm.tax_number}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        tax_number: event.target.value,
                      })
                    }
                    placeholder="Optional TIN"
                  />
                </label>

                <label>
                  Notes
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={customerForm.notes}
                    onChange={(event) =>
                      setCustomerForm({
                        ...customerForm,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Additional information"
                  />
                </label>

                {customerError && (
                  <div className="finance-notice" role="alert">
                    {customerError}
                  </div>
                )}

                <div className="finance-modal-actions">
                  <button
                    type="button"
                    className="finance-secondary-button"
                    onClick={() => setShowCreate(false)}
                    disabled={savingCustomer}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="finance-primary-button"
                    disabled={savingCustomer}
                  >
                    {savingCustomer ? "Saving..." : "Save customer"}
                  </button>
                </div>
              </form>
            ) : active === "Quotes" ? (
              <QuoteForm
                onCancel={() => setShowCreate(false)}
                onSaved={(quoteNumber) => {
                  setShowCreate(false);
                  setNotice(
                    `Quotation ${quoteNumber} was saved successfully.`
                  );
                  setActive("Quotes");
                  void loadQuotes();
                }}
              />
            ) : active === "Invoices" || active === "Overview" ? (
              <InvoiceForm
                onCancel={() => setShowCreate(false)}
                onSaved={(invoiceNumber) => {
                  setShowCreate(false);
                  setNotice(
                    `Invoice ${invoiceNumber} was saved successfully.`
                  );
                  setActive("Invoices");
                  void loadInvoices();
                }}
              />
            ) : (
              <>
                <p className="finance-subtitle">
                  This record type will be connected to database storage in a
                  later stage.
                </p>
                <div className="finance-modal-actions">
                  <button
                    type="button"
                    className="finance-secondary-button"
                    onClick={() => setShowCreate(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function InvoiceTable({ rows }: { rows: Invoice[] }) {
  if (!rows.length) {
    return (
      <div className="finance-empty">
        <h3>No invoices yet</h3>
        <p>Create an invoice to see it listed here.</p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>INVOICE</th>
            <th>CUSTOMER</th>
            <th>ISSUED</th>
            <th>DUE DATE</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <b className="invoice-id">{row.invoice_number}</b>
              </td>
              <td>{row.business_contacts?.name || "—"}</td>
              <td>{dateLabel(row.issue_date)}</td>
              <td>{dateLabel(row.due_date)}</td>
              <td className="invoice-amount">
                {money(Number(row.total), row.currency || "UGX")}
              </td>
              <td>
                <span
                  className={`invoice-status ${(row.status || "draft").toLowerCase()}`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuoteTable({ rows }: { rows: Quote[] }) {
  if (!rows.length) {
    return (
      <div className="finance-empty">
        <div className="finance-empty-icon">▧</div>
        <h3>No quotations yet</h3>
        <p>Create a quotation to see it listed here.</p>
      </div>
    );
  }

  return (
    <div className="finance-table-wrap">
      <table className="finance-table">
        <thead>
          <tr>
            <th>QUOTATION</th>
            <th>CUSTOMER</th>
            <th>ISSUED</th>
            <th>VALID UNTIL</th>
            <th>AMOUNT</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <b className="invoice-id">{row.quote_number}</b>
              </td>
              <td>{row.business_contacts?.name || "—"}</td>
              <td>{dateLabel(row.issue_date)}</td>
              <td>{dateLabel(row.valid_until)}</td>
              <td className="invoice-amount">
                {money(Number(row.total), row.currency || "UGX")}
              </td>
              <td>
                <span
                  className={`invoice-status ${(row.status || "draft").toLowerCase()}`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
