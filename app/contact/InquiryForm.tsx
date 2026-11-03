"use client";

import { useState, type FormEvent } from "react";

type FormMode = "inquiry" | "consultation";

export default function InquiryForm() {
  const [mode, setMode] = useState<FormMode>("inquiry");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("Business Consultancy");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("Morning");
  const [details, setDetails] = useState("");
  const [notice, setNotice] = useState("");

  function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const heading = mode === "consultation" ? "CONSULTATION REQUEST" : "SERVICE INQUIRY";
    const lines = [
      "Hello Johden Business Consultancy Services,",
      "",
      heading,
      "Name: " + name,
      "Email: " + (email || "Not provided"),
      "Phone: " + (phone || "Not provided"),
      "Service: " + service,
      ...(mode === "consultation" ? ["Preferred date: " + (date || "Flexible"), "Preferred time: " + time] : []),
      "Requirements: " + (details || "I would like to discuss my requirements."),
    ];
    const message = lines.join("\n");
    setNotice("Opening WhatsApp chat with Johden. Review your message and tap Send.");
    window.open("https://wa.me/256702846597?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="inquiry-shell">
      <div className="form-tabs" role="tablist" aria-label="Contact type">
        <button type="button" className={mode === "inquiry" ? "form-tab active" : "form-tab"} onClick={() => { setMode("inquiry"); setNotice(""); }}>Service inquiry</button>
        <button type="button" className={mode === "consultation" ? "form-tab active" : "form-tab"} onClick={() => { setMode("consultation"); setNotice(""); }}>Book a consultation</button>
      </div>
      <form className="inquiry-form" onSubmit={submitForm}>
        <div className="form-intro"><span className="eyebrow">LET’S GET STARTED</span><h2>{mode === "consultation" ? "Plan a conversation." : "Tell us what you need."}</h2><p>{mode === "consultation" ? "Suggest a convenient time. We’ll confirm availability with you." : "Share a few details so we can understand your goals and guide you to the right service."}</p></div>
        <div className="form-grid">
          <label>Full name <input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" /></label>
          <label>Email address <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>
          <label>Phone / WhatsApp <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256…" autoComplete="tel" /></label>
          <label>What do you need help with? <select value={service} onChange={e => setService(e.target.value)}><option>Business Consultancy</option><option>Marketing & Branding</option><option>Software & Technology</option><option>Research & Analytics</option><option>Creative & Corporate Services</option><option>Business Support</option><option>Other / Not sure yet</option></select></label>
          {mode === "consultation" && <><label>Preferred date <input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} /></label><label>Preferred time <select value={time} onChange={e => setTime(e.target.value)}><option>Morning</option><option>Afternoon</option><option>Evening</option><option>Flexible</option></select></label></>}
          <label className="full-field">Tell us a little about your project <textarea rows={4} value={details} onChange={e => setDetails(e.target.value)} placeholder="Your goals, questions, timeline or requirements…" /></label>
        </div>
        <button className="button button-primary form-submit" type="submit">{mode === "consultation" ? "Request a consultation" : "Send service inquiry"} <span>↗</span></button>
        <p className="privacy-note">Your details are used to respond to your request. Submitting opens WhatsApp with a prepared message; it does not send automatically.</p>
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>
    </div>
  );
}