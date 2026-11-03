"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Feedback = { id: string; name: string; service: string; message: string; created_at: string };

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [name, setName] = useState("");
  const [service, setService] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/feedback").then((r) => r.ok ? r.json() : { feedback: [] }).then((d) => setItems(d.feedback || [])).catch(() => setItems([]));
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, service, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't submit your feedback. Please try again.");
      setStatus("Thank you. Your feedback has been received and will appear here after review.");
      setName(""); setService(""); setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="inner-page feedback-page">
    <header className="site-header">
      <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
      <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/technology">Technology</a>
          <a href="/contact">Contact</a>
          <a href="/feedback" aria-current="page">Feedback</a>
        </nav>
      <a className="button button-primary header-cta" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Let’s talk ↗</a>
    </header>
    <section className="feedback-intro"><span className="eyebrow dark"><i/> YOUR EXPERIENCE MATTERS</span><h1>Client <em>Feedback</em></h1><p>Have we worked with you? Share your experience to help us keep improving and help others learn about working with Johden.</p></section>
    <section className="feedback-layout">
      <form className="feedback-form" onSubmit={submit}>
        <span className="eyebrow dark"><i/> SHARE YOUR EXPERIENCE</span><h2>Tell us how we did.</h2>
        <label htmlFor="feedback-name">Your name <span>(optional)</span></label><input id="feedback-name" value={name} onChange={e=>setName(e.target.value)} maxLength={80} placeholder="Name or leave blank to stay anonymous" />
        <label htmlFor="feedback-service">Service you received</label><select id="feedback-service" value={service} onChange={e=>setService(e.target.value)} required><option value="">Choose a service</option><option>Business plans and proposals</option><option>Research and academic support</option><option>Marketing and branding</option><option>Software and technology</option><option>Company registration and bidding</option><option>Other consultancy service</option></select>
        <label htmlFor="feedback-message">Your feedback</label><textarea id="feedback-message" value={message} onChange={e=>setMessage(e.target.value)} required minLength={10} maxLength={1500} rows={6} placeholder="Tell us about your experience working with Johden..." />
        <p className="feedback-privacy">Feedback is reviewed before publication. Please do not include confidential or sensitive personal information.</p>
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit feedback ↗"}</button>
        {status && <p className="feedback-status" role="status">{status}</p>}
      </form>
      <div className="feedback-list"><span className="eyebrow dark"><i/> FROM OUR CLIENTS</span><h2>Experiences shared with us.</h2><p className="feedback-list-note">Only feedback approved for publication appears below.</p>
        {items.length ? items.map(item=><article className="feedback-card" key={item.id}><span className="feedback-quote">“</span><p>{item.message}</p><strong>{item.name?.trim() || "Johden client"}</strong><small>{item.service}</small></article>) : <div className="feedback-empty"><strong>Be the first to share your experience.</strong><p>We look forward to hearing from you.</p></div>}
      </div>
    </section>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span></div></footer>
  </main>;
}
