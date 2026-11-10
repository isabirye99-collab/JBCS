"use client";

import { FormEvent, useState } from "react";

type Patient = { id: string; patient_number: string; full_name: string };

export default function AppointmentForm({ patients }: { patients: Patient[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fieldStyle = { width: "100%", minWidth: 0, boxSizing: "border-box" as const, border: "1px solid #d9dee7", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#252b36", font: "inherit" };
  const labelStyle = { display: "grid", gap: 6, color: "#454d5a", fontSize: 13, fontWeight: 700 as const };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    const form = event.currentTarget;
    const payload = { ...Object.fromEntries(new FormData(form).entries()), timezone_offset_minutes: new Date().getTimezoneOffset() };
    try {
      const response = await fetch("/api/clinic/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Appointment could not be scheduled.");
      setMessage("Appointment scheduled successfully. Refreshing the clinic schedule…");
      form.reset();
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Appointment could not be scheduled.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
    {patients.length === 0 ? <p style={{ margin: 0, color: "#687080" }}>Register a patient first, then return here to schedule an appointment.</p> : <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14 }}>
        <label style={labelStyle}>Patient *<select name="patient_id" required defaultValue="" style={fieldStyle}><option value="" disabled>Select a registered patient</option>{patients.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.patient_number}</option>)}</select></label>
        <label style={labelStyle}>Date and time *<input name="appointment_at" type="datetime-local" required min={new Date(Date.now() + 60_000).toISOString().slice(0,16)} style={fieldStyle}/></label>
        <label style={labelStyle}>Reason for visit<input name="reason" maxLength={500} placeholder="e.g. General consultation" style={fieldStyle}/></label>
      </div>
      <p style={{ margin: 0, color: "#687080", fontSize: 12 }}>Appointment times are saved using the clinic’s local time zone settings. Only schedule patients registered to Johnpaul Medical Center.</p>
      {error && <p role="alert" style={{ color: "#a61b29", background: "#fff0f1", borderRadius: 8, padding: 12, margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: "#17663a", background: "#eaf8ef", borderRadius: 8, padding: 12, margin: 0 }}>{message}</p>}
      <div><button disabled={busy} type="submit" style={{ border: 0, borderRadius: 9, background: busy ? "#9ba2ad" : "#ad1d2e", color: "#fff", fontWeight: 800, padding: "12px 18px", cursor: busy ? "wait" : "pointer" }}>{busy ? "Scheduling…" : "Schedule appointment"}</button></div>
    </>}
  </form>;
}
