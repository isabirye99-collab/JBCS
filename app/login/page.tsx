"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signup");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(mode === "signup" ? "/api/saas/signup" : "/api/saas/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password, currency }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request could not be completed.");
      if (mode === "login") { window.location.assign(result.redirectTo || "/workspace"); return; }
      setMessage(result.message || "Account created. Check your email for next steps.");
      if (!result.requiresEmailConfirmation) window.location.assign("/workspace");
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="admin-login-shell">
    <section className="admin-login-card" aria-labelledby="saas-auth-title">
      <Link href="/" className="invoice-access-link">← Johden home</Link>
      <span className="admin-eyebrow">JOHDEN BUSINESS TOOLS</span>
      <h1 id="saas-auth-title">{mode === "signup" ? "Create your business workspace" : "Welcome back"}</h1>
      <p>{mode === "signup" ? "Start with a 14-day trial. Annual subscription billing is available in UGX or USD." : "Sign in to continue to your business workspace."}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => { setMode("signup"); setError(""); setMessage(""); }} disabled={busy} aria-pressed={mode === "signup"}>Create account</button>
        <button type="button" onClick={() => { setMode("login"); setError(""); setMessage(""); }} disabled={busy} aria-pressed={mode === "login"} style={{ background: mode === "login" ? "#b72c38" : "#fff", color: mode === "login" ? "#fff" : "#51484b" }}>Sign in</button>
      </div>
      <form onSubmit={submit} className="admin-client-form">
        {mode === "signup" && <label>Company or business name<input required minLength={2} maxLength={140} value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" /></label>}
        <label>Email address<input type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>Password<input type="password" required minLength={10} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
        {mode === "signup" && <label>Subscription billing currency<select value={currency} onChange={e => setCurrency(e.target.value)}><option value="UGX">UGX — Ugandan Shilling</option><option value="USD">USD — US Dollar</option></select></label>}
        {error && <p className="admin-error" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create workspace and start trial" : "Sign in securely"}</button>
      </form>
      {mode === "signup" && <small>By creating an account, you agree to use the platform responsibly. Trial access lasts 14 days; payment collection and paid-plan activation are not yet enabled.</small>}
    </section>
  </main>;
}
