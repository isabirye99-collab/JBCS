"use client";

import FinanceSidebar from "@/components/finance/FinanceSidebar";
import "../finance.css";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileUp, LoaderCircle, UploadCloud, XCircle } from "lucide-react";

type ImportType = "customers" | "suppliers" | "items" | "expenses" | "invoices" | "payments" | "recurring";
type Row = Record<string, string>;
const options: { value: ImportType; label: string; help: string; required: string[] }[] = [
  { value: "customers", label: "Customers", help: "Imports customer names and contact details. Existing names are skipped.", required: ["name"] },
  { value: "suppliers", label: "Suppliers", help: "Imports supplier contacts. Existing names are skipped.", required: ["name"] },
  { value: "items", label: "Items & Services", help: "Catalogue fields must include item_code, name, item_type, unit_price and currency.", required: ["item_code","name","item_type","unit_price","currency"] },
  { value: "expenses", label: "Expenses", help: "Accepts Zoho expense exports including date, account_name, amount_with_tax and transaction_id. The original expense date is retained.", required: ["expense_date","category","description","amount","currency"] },
  { value: "invoices", label: "Invoices & line items", help: "Accepts Zoho invoice headers or invoice line exports. Preserves invoice date, due date, original number, status, total and balance when supplied. Multi-line invoices are grouped by invoice number.", required: ["invoice_number","customer_name","issue_date"] },
  { value: "payments", label: "Payments received", help: "Use a Zoho payments/receipts export with invoice_number, payment_date, amount and method. Actual transaction dates are preserved.", required: ["invoice_number","payment_date","amount"] },
  { value: "recurring", label: "Recurring invoices & expenses", help: "Accepts Zoho recurring invoice exports and retains start, last-sent, next-invoice and end dates where supplied.", required: ["name","frequency","amount","currency","next_run_date"] },
];

function parseCsv(text: string): Row[] {
  const input = text.replace(/^\uFEFF/, "");
  const matrix: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); matrix.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.replace(/\r$/, "")); matrix.push(row); }
  const headers = (matrix.shift() || []).map(h => h.trim().toLowerCase());
  return matrix.filter(r => r.some(v => v.trim() !== "")).map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()])));
}
function canonicalizeRows(type: ImportType, input: Row[]): Row[] {
  const aliases: Record<string,string> = {
    client_name: "customer_name", customer: "customer_name", invoice: "invoice_number",
    transaction_number: "invoice_number", currency_code: "currency",
    transaction_date: type === "expenses" ? "expense_date" : type === "payments" ? "payment_date" : "issue_date",
    date: type === "expenses" ? "expense_date" : type === "payments" ? "payment_date" : "issue_date",
    account_name: "category", expense_description: "description", payment_amount: "amount",
    amount_received: "amount", payment_mode: "payment_method", reference: "reference_number",
    recurrence_name: "name", recurrence_frequency: "frequency", next_invoice_date: "next_run_date",
    quantity_ordered: "quantity", bcy_item_price: "unit_price",
  };
  return input.map((raw) => {
    const r: Row = { ...raw };
    for (const [from,to] of Object.entries(aliases)) if ((r[to] == null || String(r[to]).trim() === "") && r[from] != null && String(r[from]).trim() !== "") r[to] = r[from];
    if (type === "customers" && !r.name) r.name = r.customer_name || r.contact_name;
    if (type === "suppliers" && !r.name) r.name = r.supplier_name || r.vendor_name;
    if (type === "expenses") {
      if (!r.description) r.description = r.category || r.receipt_name || r.reference_number || "Imported Zoho expense";
      if (r.amount == null || String(r.amount).trim() === "") r.amount = r.amount_with_tax ?? r.bcy_total;
      if (!r.currency) r.currency = "UGX";
    }
    if (type === "invoices") {
      if (r.bcy_balance != null && String(r.bcy_balance).trim() !== "") {
        if (!r.original_invoice_total) r.original_invoice_total = r.bcy_total;
        if (!r.original_balance) r.original_balance = r.bcy_balance;
        if (!r.original_status) r.original_status = r.status;
        if (!r.legacy_invoice_id) r.legacy_invoice_id = r.invoice_id;
      }
      if (!r.description) r.description = r.product_name || r.item_name || `Imported Zoho invoice ${String(r.invoice_number || "")}`;
      if (r.quantity == null || String(r.quantity).trim() === "") r.quantity = r.quantity_ordered || "1";
      if (r.unit_price == null || String(r.unit_price).trim() === "") r.unit_price = r.bcy_item_price ?? r.original_invoice_total ?? r.bcy_total ?? "0";
      if (!r.currency) r.currency = "UGX";
      if (!r.original_status) r.original_status = r.status;
    }
    if (type === "payments") {
      if (!r.payment_reference) r.payment_reference = r.reference_number || r.transaction_id;
      if (!r.method) r.method = r.payment_method || r.payment_mode || "other";
      if (!r.currency) r.currency = "UGX";
    }
    if (type === "recurring") {
      if (r.amount == null || String(r.amount).trim() === "") r.amount = r.bcy_total;
      if (!r.currency) r.currency = "UGX";
    }
    return Object.fromEntries(Object.entries(r).map(([k,v]) => [k, v == null ? "" : String(v).trim()]));
  });
}

function downloadTemplate(type: ImportType) {
  const selected = options.find(o => o.value === type)!;
  const extra: Record<string,string[]> = {
    customers:["email","phone","address","tax_number"],
    suppliers:["email","phone","address","tax_number"],
    items:["description","category","unit","tax_rate"],
    expenses:["payment_method","notes","legacy_transaction_id"],
    invoices:["due_date","tax_rate","original_status","original_invoice_total","original_balance","legacy_invoice_id","legacy_customer_id","notes"],
    payments:["currency","method","payment_reference","notes","exchange_rate","transaction_id"],
    recurring:["customer_name","description","start_date","end_date","last_sent_date","status","reference_number"],
  };
  const headers = [...selected.required, ...(extra[type] || [])];
  const blob = new Blob(["\uFEFF" + headers.join(",") + "\r\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `jbcs-${type}-import-template.csv`; a.click(); URL.revokeObjectURL(url);
}

export default function FinanceImportPage() {
  const [type, setType] = useState<ImportType>("customers");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<Array<{row:number;message:string}>>([]);
  const [result, setResult] = useState<{imported:number;skipped:number;errors?:Array<{row:number;message:string}>}|null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sortDirection, setSortDirection] = useState<"asc"|"desc">("asc");
  const current = options.find(o => o.value === type)!;
  const missing = useMemo(() => current.required.filter(h => rows.length && !(h in rows[0])), [current, rows]);
  async function chooseFile(file?: File) {
    setError(""); setResult(null); setErrors([]); setDone(false); setRows([]);
    if (!file) { setFileName(""); return; }
    setFileName(file.name);
    try {
      if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Please save the Zoho Excel file as CSV UTF-8 first, then upload it here. CSV imports preserve the date values from the export.");
      const parsed = canonicalizeRows(type, parseCsv(await file.text()));
      if (!parsed.length) throw new Error("The CSV has no data rows.");
      const absent = current.required.filter(h => !(h in parsed[0]));
      if (absent.length) throw new Error(`Missing required columns after mapping Zoho headings: ${absent.join(", ")}. Check the selected import type.`);
      if (parsed.length > 5000) throw new Error("This importer accepts up to 5,000 rows per batch. Split larger files into smaller CSV batches.");
      setRows(parsed);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not read this CSV."); }
  }
  const previewRows = useMemo(() => {
    const dateKey = type === "expenses" ? "expense_date" : type === "payments" ? "payment_date" : type === "recurring" ? "next_run_date" : "issue_date";
    return [...rows].sort((a,b) => {
      const av = String(a[dateKey] || a.date || ""); const bv = String(b[dateKey] || b.date || "");
      return av.localeCompare(bv) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [rows, type, sortDirection]);
  async function importRows() {
    setBusy(true); setError(""); setResult(null); setErrors([]);
    try {
      const response = await fetch("/api/saas/import", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({type,rows:previewRows}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "CSV import failed.");
      setResult(data); setErrors(data.errors || []); setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : "CSV import failed."); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <FinanceSidebar activeHref="/workspace/finance/import" />
    <main className="min-h-screen px-4 py-6 md:ml-[264px] md:px-8 jbcs-finance-consistent-main">
    <div className="mx-auto max-w-6xl">
      <Link href="/workspace/finance" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft size={16}/> Back to Finance</Link>
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-600">Data management</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Import CSV data</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload customers, suppliers, items, invoices, expenses, recurring templates and dated payment transactions from one place. Zoho column names are mapped automatically, and the original transaction dates are retained for sorting.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold" htmlFor="import-type">Import into</label>
          <select id="import-type" value={type} onChange={e => {setType(e.target.value as ImportType);setRows([]);setFileName("");setError("");setResult(null);setErrors([]);setDone(false);}} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm">
            {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="mt-3 text-sm leading-6 text-slate-600">{current.help}</p>
          <button onClick={() => downloadTemplate(type)} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50">Download CSV template</button>
          <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <strong>Recommended order:</strong> customers, suppliers, items, invoices, expenses, then actual payment transactions. Zoho invoice dates, due dates, totals, balances and statuses are retained when present. Use a real Zoho payment/receipt export for payment dates.
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="csv-file" className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center hover:border-rose-400 hover:bg-rose-50/30">
            <UploadCloud size={32} className="mb-3 text-slate-500"/>
            <span className="font-semibold">Choose a CSV file</span>
            <span className="mt-1 text-sm text-slate-500">Zoho CSV exports supported Â· up to 5,000 rows per batch</span>
            {fileName && <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"><FileUp size={14}/>{fileName}</span>}
          </label>
          <input id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" onChange={e => void chooseFile(e.target.files?.[0])}/>
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mr-2 inline" size={16}/>{error}</div>}
          {rows.length > 0 && <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Preview</h2><p className="text-sm text-slate-500">{rows.length} data rows detected Â· dates retained</p></div><div className="flex items-center gap-2"><label htmlFor="sort-date" className="text-xs font-medium text-slate-600">Sort by date</label><select id="sort-date" value={sortDirection} onChange={e=>setSortDirection(e.target.value as "asc"|"desc")} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="asc">Oldest first</option><option value="desc">Newest first</option></select><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Headers mapped</span></div></div>
            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200"><table className="w-full border-collapse text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{Object.keys(rows[0]).map(h=><th key={h} className="whitespace-nowrap border-b px-3 py-2 font-semibold">{h}</th>)}</tr></thead><tbody>{previewRows.slice(0,8).map((r,i)=><tr key={i} className="odd:bg-white even:bg-slate-50">{Object.keys(rows[0]).map(h=><td key={h} className="max-w-56 truncate border-b px-3 py-2">{r[h]}</td>)}</tr>)}</tbody></table></div>
            <button disabled={busy || !!missing.length} onClick={() => void importRows()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#F3192D] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy?<><LoaderCircle className="animate-spin" size={16}/> Importingâ€¦</>:<><UploadCloud size={16}/> Import {rows.length} rows</>}</button>
          </div>}
          {done && result && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="font-semibold text-emerald-900"><CheckCircle2 className="mr-2 inline" size={18}/>Import finished</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg bg-white p-3"><p className="text-slate-500">Imported</p><p className="mt-1 text-2xl font-bold">{result.imported}</p></div><div className="rounded-lg bg-white p-3"><p className="text-slate-500">Skipped duplicates</p><p className="mt-1 text-2xl font-bold">{result.skipped}</p></div></div>
            {!!errors.length && <div className="mt-4 max-h-48 overflow-auto rounded-lg bg-white p-3 text-sm text-red-800"><p className="mb-2 font-semibold">{errors.length} rows need attention</p>{errors.map((e,i)=><p key={i}>Row {e.row}: {e.message}</p>)}</div>}
          </div>}
        </section>
      </div>
    </div>
  </main>
  </div>;
}
