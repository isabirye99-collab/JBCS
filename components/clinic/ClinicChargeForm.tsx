"use client";

import { FormEvent, useState } from "react";

type Patient = { id: string; patient_number: string; full_name: string };

export default function ClinicChargeForm({ patients }: { patients: Patient[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fieldStyle = { width: "100%", minWidth: 0, boxSizing: "border-box" as const, border: "1px solid #d9dee7", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#252b36", font: "inherit" };
  const labelStyle = { display: "grid", gap: 6, color: "#454d5a", fontSize: 13, fontWeight: 700 as const };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/clinic/charges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Charge could not be saved.");
      setMessage("Charge added successfully. Refreshing the billing list…");
      form.reset();
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) { setError(e instanceof Error ? e.message : "Charge could not be saved."); }
    finally { setBusy(false); }
  }

  if (!patients.length) return <p style={{ color: "#687080" }}>Register a patient before adding a charge.</p>;
  return <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 14 }}>
      <label style={labelStyle}>Patient *<select name="patient_id" required defaultValue="" style={fieldStyle}><option value="" disabled>Select patient</option>{patients.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.patient_number}</option>)}</select></label>
      <label style={labelStyle}>Service or item *<input name="description" required maxLength={240} placeholder="e.g. Consultation fee" style={fieldStyle}/></label>
      <label style={labelStyle}>Quantity *<input name="quantity" required type="number" min="0.01" max="100000" step="0.01" defaultValue="1" style={fieldStyle}/></label>
      <label style={labelStyle}>Unit price *<input name="unit_price" required type="number" min="0" max="1000000000000" step="0.01" placeholder="0.00" style={fieldStyle}/></label>
      <label style={labelStyle}>Currency *<select name="currency" defaultValue="UGX" required style={fieldStyle}>{["UGX","USD","KES","TZS","EUR","GBP"].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
    </div>
    <p style={{ margin: 0, color: "#687080", fontSize: 12 }}>New charges are recorded as unpaid. Recording a charge does not count as receiving payment.</p>
    {error && <p role="alert" style={{ color: "#a61b29", background: "#fff0f1", borderRadius: 8, padding: 12, margin: 0 }}>{error}</p>}
    {message && <p role="status" style={{ color: "#17663a", background: "#eaf8ef", borderRadius: 8, padding: 12, margin: 0 }}>{message}</p>}
    <div><button type="submit" disabled={busy} style={{ border: 0, borderRadius: 9, background: busy ? "#9ba2ad" : "#ad1d2e", color: "#fff", fontWeight: 800, padding: "12px 18px", cursor: busy ? "wait" : "pointer" }}>{busy ? "Saving charge…" : "Add patient charge"}</button></div>
  </form>;
}
