
"use client";

import { useEffect, useState } from "react";

type Customer = {
  id: string;
  name: string;
};

type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

type QuoteFormProps = {
  onCancel: () => void;
  onSaved: (quoteNumber: string) => void;
};

const today = new Date().toISOString().slice(0, 10);
const emptyItem: QuoteItem = {
  description: "",
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
};

export default function QuoteForm({ onCancel, onSaved }: QuoteFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactId, setContactId] = useState("");
  const [issueDate, setIssueDate] = useState(today);
  const [validUntil, setValidUntil] = useState(
    `${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}`
  );
  const [currency, setCurrency] = useState("UGX");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([{ ...emptyItem }]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCustomers() {
      try {
        const response = await fetch("/api/finance/customers", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load customers.");
        }
        const records: Customer[] = Array.isArray(data.customers)
          ? data.customers
          : [];
        setCustomers(records);
        if (records.length) setContactId(records[0].id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load customers.");
      } finally {
        setLoadingCustomers(false);
      }
    }

    void loadCustomers();
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.quantity) * Math.max(0, item.unit_price),
    0
  );
  const taxTotal = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, item.quantity) *
        Math.max(0, item.unit_price) *
        Math.max(0, item.tax_rate) /
        100,
    0
  );
  const total = subtotal + taxTotal;

  function updateItem(index: number, changes: Partial<QuoteItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...changes } : item))
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!contactId) {
      setError("Add a customer before creating a quotation.");
      return;
    }
    if (validUntil < issueDate) {
      setError("The valid-until date cannot be before the issue date.");
      return;
    }
    if (
      items.some(
        (item) =>
          !item.description.trim() ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unit_price) ||
          item.unit_price < 0 ||
          !Number.isFinite(item.tax_rate) ||
          item.tax_rate < 0
      )
    ) {
      setError("Complete each item with a description and valid amounts.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/finance/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          issue_date: issueDate,
          valid_until: validUntil,
          currency,
          exchange_rate: Number(exchangeRate),
          notes,
          items,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save quotation.");
      }
      onSaved(data.quote.quote_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save quotation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="finance-form">
      {error && <div className="finance-notice" role="alert">{error}</div>}

      {loadingCustomers ? (
        <p>Loading customers…</p>
      ) : customers.length === 0 ? (
        <p>Add a customer in the Customers section before creating a quotation.</p>
      ) : (
        <label>
          Customer *
          <select required value={contactId} onChange={(e) => setContactId(e.target.value)}>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
        </label>
      )}

      <div className="finance-form-grid">
        <label>
          Issue date *
          <input required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </label>
        <label>
          Valid until *
          <input required type="date" min={issueDate} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </label>
        <label>
          Currency *
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="UGX">UGX — Ugandan Shilling</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — Pound Sterling</option>
            <option value="KES">KES — Kenyan Shilling</option>
          </select>
        </label>
        <label>
          Exchange rate *
          <input required type="number" min="0.000001" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
        </label>
      </div>

      <h3>Quotation items</h3>
      {items.map((item, index) => (
        <div className="finance-quote-item" key={index}>
          <label>
            Description *
            <input required maxLength={500} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="Service or product" />
          </label>
          <div className="finance-form-grid">
            <label>
              Quantity *
              <input required type="number" min="0.001" step="any" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
            </label>
            <label>
              Unit price *
              <input required type="number" min="0" step="any" value={item.unit_price} onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })} />
            </label>
            <label>
              Tax (%)
              <input type="number" min="0" step="any" value={item.tax_rate} onChange={(e) => updateItem(index, { tax_rate: Number(e.target.value) })} />
            </label>
          </div>
          {items.length > 1 && (
            <button type="button" className="finance-secondary-button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
              Remove item
            </button>
          )}
        </div>
      ))}

      <button type="button" className="finance-secondary-button" onClick={() => setItems((current) => [...current, { ...emptyItem }])}>
        + Add item
      </button>

      <div className="finance-quote-total">
        <p>Subtotal: <strong>{new Intl.NumberFormat("en-UG", { style: "currency", currency }).format(subtotal)}</strong></p>
        <p>Tax: <strong>{new Intl.NumberFormat("en-UG", { style: "currency", currency }).format(taxTotal)}</strong></p>
        <p>Total: <strong>{new Intl.NumberFormat("en-UG", { style: "currency", currency }).format(total)}</strong></p>
      </div>

      <label>
        Notes / terms
        <textarea rows={3} maxLength={4000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quotation terms, delivery details or additional notes" />
      </label>

      <div className="finance-modal-actions">
        <button type="button" className="finance-secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="finance-primary-button" disabled={saving || loadingCustomers || customers.length === 0}>
          {saving ? "Saving quotation…" : "Save quotation"}
        </button>
      </div>
    </form>
  );
}
