"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to log in."); return; }
      router.replace("/admin"); router.refresh();
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="admin-login-shell">
    <form className="admin-login-card" onSubmit={submit}>
      <Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={170} height={58} priority />
      <span className="admin-eyebrow">WEBSITE MANAGEMENT</span>
      <h1>Welcome back</h1>
      <p>Sign in to manage your website, clients and customer feedback.</p>
      <label htmlFor="admin-email">Administrator email</label>
      <input id="admin-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
      <a href="/">← Back to website</a>
    </form>
  </main>;
}
