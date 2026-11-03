"use client";

import { FormEvent, useState } from "react";

export default function PatientRegistrationForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = Object.fromEntries(data.entries());
    try {
      const response = await fetch("/api/clinic/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Patient registration failed.");
      setMessage(`Patient registered successfully. Patient number: ${result.patient.patient_number}. Refreshing the patient list…`);
      form.reset();
      // The directory is server-rendered; reload it so the new record appears immediately.
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Patient registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const fieldStyle = { width: "100%", minWidth: 0, boxSizing: "border-box" as const, border: "1px solid #d9dee7", borderRadius: 9, padding: "11px 12px", background: "#fff", color: "#252b36", font: "inherit" };
  const labelStyle = { display: "grid", gap: 6, color: "#454d5a", fontSize: 13, fontWeight: 700 as const };

  return <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))", gap: 14 }}>
      <label style={labelStyle}>Full name *<input name="full_name" required minLength={2} maxLength={160} autoComplete="name" style={fieldStyle} /></label>
      <label style={labelStyle}>Phone number<input name="phone" maxLength={30} autoComplete="tel" style={fieldStyle} /></label>
      <label style={labelStyle}>Date of birth<input name="date_of_birth" type="date" max={new Date().toISOString().slice(0,10)} style={fieldStyle} /></label>
      <label style={labelStyle}>Sex<select name="sex" defaultValue="" style={fieldStyle}><option value="">Not specified</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option><option value="undisclosed">Prefer not to say</option></select></label>
      <label style={labelStyle}>Email address<input name="email" type="email" maxLength={254} autoComplete="email" style={fieldStyle} /></label>
      <label style={labelStyle}>Address<input name="address" maxLength={500} autoComplete="street-address" style={fieldStyle} /></label>
      <label style={labelStyle}>Emergency contact name<input name="emergency_contact_name" maxLength={160} style={fieldStyle} /></label>
      <label style={labelStyle}>Emergency contact phone<input name="emergency_contact_phone" maxLength={30} style={fieldStyle} /></label>
    </div>
    <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>Only collect information needed for care and administration. Clinical notes are intentionally not part of this registration form.</p>
    {error && <p role="alert" style={{ color: "#a61b29", background: "#fff0f1", borderRadius: 8, padding: 12, margin: 0 }}>{error}</p>}
    {message && <p role="status" style={{ color: "#17663a", background: "#eaf8ef", borderRadius: 8, padding: 12, margin: 0 }}>{message}</p>}
    <div><button disabled={busy} type="submit" style={{ border: 0, borderRadius: 9, background: busy ? "#9ba2ad" : "#ad1d2e", color: "#fff", fontWeight: 800, padding: "12px 18px", cursor: busy ? "wait" : "pointer" }}>{busy ? "Registering…" : "Register patient"}</button></div>
  </form>;
}
