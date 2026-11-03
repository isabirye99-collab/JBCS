"use client";

import { useEffect, useState } from "react";

type Customer = { id: string; name: string };
type InvoiceItem = {
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
};

const emptyItem: InvoiceItem = {
  description: "",
  quantity: "1",
  unit_price: "0",
  tax_rate: "0",
};

function localDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export default function InvoiceForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (invoiceNumber: string) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactId, setContactId] = useState("");
  const [issueDate, setIssueDate] = useState(localDate());
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        const response = await fetch("/api/finance/customers", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load customers.");
        if (active) setCustomers(Array.isArray(data.customers) ? data.customers : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load customers.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadCustomers();
    return () => { active = false; };
  }, []);

  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unit_price);
    return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0);
  }, 0);
  const taxTotal = items.reduce((sum, item) => {
    const base = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    return sum + base * ((Number(item.tax_rate) || 0) / 100);
  }, 0);
  const total = subtotal + taxTotal;
  const money = (amount: number) => new Intl.NumberFormat("en-UG", {
    style: "currency", currency, maximumFractionDigits: 2,
  }).format(amount);

  function updateItem(index: number, field: keyof InvoiceItem, value: string) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: contactId,
          issue_date: issueDate,
          due_date: dueDate || null,
          currency,
          exchange_rate: Number(exchangeRate),
          notes,
          items: items.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            tax_rate: Number(item.tax_rate),
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save invoice.");
      onSaved(data.invoice.invoice_number);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="finance-invoice-form">
      {error && <div className="finance-notice" role="alert">{error}</div>}
      <label>
        Customer *
        <select required value={contactId} onChange={(e) => setContactId(e.target.value)} disabled={loading}>
          <option value="">{loading ? "Loading customers..." : "Select a customer"}</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </label>
      {!loading && customers.length === 0 && <p className="finance-subtitle">Add a customer in Customers before creating an invoice.</p>}

      <div className="finance-invoice-fields">
        <label>Invoice date *<input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label>Due date<input type="date" min={issueDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        <label>Currency
          <select value={currency} onChange={(e) => { setCurrency(e.target.value); setExchangeRate(e.target.value === "UGX" ? "1" : ""); }}>
            <option value="UGX">UGX — Uganda Shilling</option><option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option><option value="GBP">GBP — British Pound</option><option value="KES">KES — Kenya Shilling</option>
          </select>
        </label>
        <label>Exchange rate (UGX per currency unit)
          <input type="number" min="0.000001" step="any" required value={exchangeRate} readOnly={currency === "UGX"} onChange={(e) => setExchangeRate(e.target.value)} />
        </label>
      </div>

      <div className="finance-invoice-items">
        <h3>Invoice items</h3>
        {items.map((item, index) => (
          <div className="finance-invoice-item" key={index}>
            <label>Description *<input required maxLength={500} value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} placeholder="Consultancy service or product" /></label>
            <div className="finance-invoice-fields">
              <label>Quantity *<input type="number" min="0.001" step="any" required value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></label>
              <label>Unit price *<input type="number" min="0" step="0.01" required value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} /></label>
              <label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={item.tax_rate} onChange={(e) => updateItem(index, "tax_rate", e.target.value)} /></label>
            </div>
            <p>Line total: <strong>{money((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * (1 + (Number(item.tax_rate) || 0) / 100))}</strong></p>
            {items.length > 1 && <button type="button" className="finance-secondary-button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>Remove item</button>}
          </div>
        ))}
        <button type="button" className="finance-secondary-button" disabled={items.length >= 100} onClick={() => setItems((current) => [...current, { ...emptyItem }])}>+ Add item</button>
      </div>

      <label>Notes<textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment terms or additional information" /></label>
      <div className="finance-invoice-total">
        <p>Subtotal <strong>{money(subtotal)}</strong></p>
        <p>Tax <strong>{money(taxTotal)}</strong></p>
        <p>Total <strong>{money(total)}</strong></p>
      </div>
      <div className="finance-modal-actions">
        <button type="button" className="finance-secondary-button" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="finance-primary-button" disabled={saving || loading || customers.length === 0}>{saving ? "Saving invoice..." : "Save invoice"}</button>
      </div>
    </form>
  );
}
