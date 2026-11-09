"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";

type Mode = "login" | "signup";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(mode === "signup" ? "/api/saas/signup" : "/api/saas/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, password, currency: "UGX" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request could not be completed.");
      if (mode === "login") {
        const requested = new URLSearchParams(window.location.search).get("next");
        const safeNext = requested && requested.startsWith("/workspace/") && !requested.startsWith("//") ? requested : result.redirectTo || "/workspace";
        window.location.assign(safeNext);
        return;
      }
      setMessage(result.message || "Account created. Check your email for next steps.");
      if (!result.requiresEmailConfirmation) window.location.assign("/workspace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  function switchMode(next: Mode) { setMode(next); setError(""); setMessage(""); }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: "1px solid #ded9d8", borderRadius: 10,
    padding: "13px 14px", background: "#fff", color: "#292326", fontSize: 15, outlineColor: "#9f1d35",
  };
  const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#373034", fontSize: 13, fontWeight: 650 };

  return <main style={{ minHeight: "100vh", padding: "28px 18px", display: "grid", placeItems: "center", background: "#f7f5f4", color: "#292326", fontFamily: "Arial, sans-serif" }}>
    <div style={{ width: "100%", maxWidth: 420 }}>
      <Link href="/" aria-label="Johden home" style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={205} height={70} priority style={{ width: 205, height: "auto", objectFit: "contain" }} />
      </Link>
      <section style={{ background: "#fff", border: "1px solid #eee8e6", borderRadius: 18, padding: "clamp(22px,5vw,34px)", boxShadow: "0 12px 38px #2b17120b" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", color: "#9f1d35", fontSize: 11, fontWeight: 800, letterSpacing: ".14em" }}>JOHDEN BUSINESS TOOLS</p>
          <h1 style={{ margin: 0, fontSize: 29, letterSpacing: "-.04em", lineHeight: 1.2 }}>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p style={{ margin: "9px 0 0", color: "#70686b", fontSize: 14, lineHeight: 1.6 }}>{mode === "login" ? "Sign in to manage your customers, invoices and expenses." : "Enter your business details to set up your workspace."}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, padding: 4, background: "#f6f1f0", borderRadius: 11, marginBottom: 22 }}>
          <button type="button" onClick={() => switchMode("login")} disabled={busy} aria-pressed={mode === "login"} style={{ border: 0, borderRadius: 8, padding: 11, cursor: "pointer", fontWeight: 700, color: mode === "login" ? "#9f1d35" : "#6e6568", background: mode === "login" ? "#fff" : "transparent", boxShadow: mode === "login" ? "0 1px 4px #0000000d" : "none" }}>Sign in</button>
          <button type="button" onClick={() => switchMode("signup")} disabled={busy} aria-pressed={mode === "signup"} style={{ border: 0, borderRadius: 8, padding: 11, cursor: "pointer", fontWeight: 700, color: mode === "signup" ? "#9f1d35" : "#6e6568", background: mode === "signup" ? "#fff" : "transparent", boxShadow: mode === "signup" ? "0 1px 4px #0000000d" : "none" }}>Create account</button>
        </div>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          {mode === "signup" && <label style={labelStyle}>Business name<input style={inputStyle} required minLength={2} maxLength={140} value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" placeholder="Your business name" /></label>}
          <label style={labelStyle}>Email address<input style={inputStyle} type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" /></label>
          <label style={labelStyle}>Password<div style={{ display: "flex", gap: 8 }}><input style={{ ...inputStyle, flex: 1, minWidth: 0 }} type={showPassword ? "text" : "password"} required minLength={mode === "signup" ? 10 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "At least 10 characters" : "Enter your password"} /><button type="button" onClick={() => setShowPassword(v => !v)} style={{ border: "1px solid #ded9d8", borderRadius: 10, padding: "0 12px", background: "#fff", color: "#62595c", fontWeight: 650 }}>{showPassword ? "Hide" : "Show"}</button></div></label>
          {error && <p role="alert" style={{ margin: 0, padding: 12, borderRadius: 9, background: "#fff0f0", color: "#a21c32", fontSize: 13, lineHeight: 1.5 }}>{error}</p>}
          {message && <p role="status" style={{ margin: 0, padding: 12, borderRadius: 9, background: "#f3f8f4", color: "#285d3b", fontSize: 13, lineHeight: 1.5 }}>{message}</p>}
          <button type="submit" disabled={busy} style={{ marginTop: 2, border: 0, borderRadius: 10, padding: 14, background: busy ? "#b7a5a8" : "#9f1d35", color: "#fff", fontSize: 15, fontWeight: 750, cursor: busy ? "wait" : "pointer" }}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"} <span aria-hidden="true">→</span></button>
        </form>
        <p style={{ margin: "18px 0 0", color: "#81777a", fontSize: 12, lineHeight: 1.6 }}>{mode === "login" ? "If you have just registered, check your email for a confirmation request." : "Use a valid email address so you can receive account updates."}</p>
      </section>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18, fontSize: 12, color: "#7c7376" }}><Link href="/invoicing" style={{ color: "#9f1d35", textDecoration: "none", fontWeight: 650 }}>← Billing overview</Link><a href="https://wa.me/256702846597?text=Hello%20Johden%2C%20I%20need%20help%20accessing%20the%20invoicing%20platform." target="_blank" rel="noopener noreferrer" style={{ color: "#9f1d35", textDecoration: "none", fontWeight: 650 }}>Need help?</a></div>
      <p style={{ textAlign: "center", color: "#a1989a", fontSize: 11, marginTop: 24 }}>© {new Date().getFullYear()} Johden Business Consultancy Services</p>
    </div>
  </main>;
}
