"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AdminResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    const type = hash.get("type");
    if (token && type === "recovery") {
      setAccessToken(token);
      setReady(true);
    } else {
      setError("This recovery link is missing a valid recovery session. Request a new password-reset email and open the newest link.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!accessToken) {
      setError("Your recovery session is missing or expired. Request a new recovery email.");
      return;
    }
    if (password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      setError("Password recovery is not configured. Ask the administrator to check the public Supabase URL and publishable key.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });

      if (!response.ok) {
        setError("Supabase could not update the password. The recovery link may have expired; request a fresh email and try again.");
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);
      setNotice("Your password has been updated. You can now sign in with your new password.");
      setPassword("");
      setConfirmPassword("");
      setAccessToken("");
    } catch {
      setError("Could not connect to Supabase. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="admin-login-shell">
    <form className="admin-login-card" onSubmit={submit}>
      <Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={170} height={58} priority />
      <span className="admin-eyebrow">SECURE ACCOUNT RECOVERY</span>
      <h1>Set a new password</h1>
      <p>Choose a new password for the JBCS website administrator account.</p>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {notice && <p className="admin-success" role="status">{notice}</p>}
      {ready && accessToken && !notice && <>
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
        <label htmlFor="confirm-password">Confirm new password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} required />
        <button type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}</button>
      </>}
      {notice && <Link href="/admin/login">Go to administrator login</Link>}
      {!ready && !notice && <Link href="/admin/login">Back to administrator login</Link>}
      <Link href="/">← Back to website</Link>
    </form>
  </main>;
}
