"use client";

import { FormEvent, useState } from "react";

export default function ContactFeedbackForm() {
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, service, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not submit your feedback. Please try again.");
      setStatus("Thank you. Your feedback has been received and will appear after review.");
      setName(""); setService(""); setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit feedback. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section id="client-feedback" className="feedback-layout" style={{ padding: "64px 7%", background: "#fffafa" }}>
    <div className="feedback-list">
      <span className="eyebrow dark"><i /> CLIENT FEEDBACK</span>
      <h2>We value your experience.</h2>
      <p>Share feedback about a service you received from Johden. Submissions are reviewed before publication.</p>
      <p className="feedback-privacy">Please do not include confidential or sensitive personal information.</p>
    </div>
    <form className="feedback-form" onSubmit={submit}>
      <span className="eyebrow dark"><i /> SHARE YOUR EXPERIENCE</span>
      <h2>Tell us how we did.</h2>
      <label htmlFor="contact-feedback-name">Your name <span>(optional)</span></label>
      <input id="contact-feedback-name" value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Name or leave blank to stay anonymous" />
      <label htmlFor="contact-feedback-service">Service you received</label>
      <select id="contact-feedback-service" value={service} onChange={e => setService(e.target.value)} required>
        <option value="">Choose a service</option>
        <option>Business plans and proposals</option><option>Research and academic support</option>
        <option>Marketing and branding</option><option>Software and technology</option>
        <option>Company registration and bidding</option><option>Other consultancy service</option>
      </select>
      <label htmlFor="contact-feedback-message">Your feedback</label>
      <textarea id="contact-feedback-message" value={message} onChange={e => setMessage(e.target.value)} required minLength={10} maxLength={1500} rows={6} placeholder="Tell us about your experience working with Johden..." />
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit feedback ↗"}</button>
      {status && <p className="feedback-status" role="status">{status}</p>}
    </form>
  </section>;
}
