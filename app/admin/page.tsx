"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string; logo_url: string; website_url: string | null; description: string | null; is_published: boolean; sort_order: number };
type Feedback = { id: string; name: string | null; service: string; message: string; status: "pending" | "approved" | "rejected"; created_at: string };

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "clients" | "feedback">("overview");
  const [clients, setClients] = useState<Client[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [c, f] = await Promise.all([fetch("/api/admin/clients", { cache: "no-store" }), fetch("/api/admin/feedback", { cache: "no-store" })]);
      if (c.status === 401 || f.status === 401) { router.replace("/admin/login"); return; }
      const cd = await c.json(); const fd = await f.json();
      if (!c.ok || !f.ok) throw new Error(cd.error || fd.error || "Unable to load dashboard.");
      setClients(cd.clients || []); setFeedback(fd.feedback || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load dashboard."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    router.replace("/admin/login"); router.refresh();
  }

  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(""); setNotice(""); setUploadingLogo(true);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Logo upload failed.");
      setLogo(data.url); setNotice("Logo uploaded. Save the client to keep it in the directory.");
    } catch (e) { setError(e instanceof Error ? e.message : "Logo upload failed."); }
    finally { setUploadingLogo(false); event.target.value = ""; }
  }

  async function saveClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    const response = await fetch("/api/admin/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, logo_url: logo, website_url: website, description, is_published: false }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not save client."); return; }
    setName(""); setLogo(""); setWebsite(""); setDescription(""); setNotice("Client saved as hidden. Publish it when you are ready."); await load();
  }

  async function toggleClient(client: Client) {
    const response = await fetch("/api/admin/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: client.id, is_published: !client.is_published }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update client."); return; }
    setClients(old => old.map(item => item.id === client.id ? { ...item, is_published: !item.is_published } : item));
  }

  async function removeClient(client: Client) {
    if (!window.confirm(`Remove ${client.name} from the client directory?`)) return;
    const response = await fetch(`/api/admin/clients?id=${encodeURIComponent(client.id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not remove client."); return; }
    setClients(old => old.filter(item => item.id !== client.id)); setNotice("Client removed.");
  }

  async function setFeedbackStatus(item: Feedback, status: Feedback["status"]) {
    const response = await fetch("/api/admin/feedback", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not update feedback."); return; }
    setFeedback(old => old.map(f => f.id === item.id ? { ...f, status } : f));
  }

  if (loading) return <main className="admin-shell"><p>Loading secure dashboard…</p></main>;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <a href="/" className="admin-brand"><img src="/johden-logo.svg" alt="Johden" /></a>
      <span className="admin-eyebrow">WEBSITE ADMIN</span>
      <nav>
        {(["overview", "clients", "feedback"] as const).map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "overview" ? "Overview" : item === "clients" ? "Clients & logos" : "Customer feedback"}</button>)}
      </nav>
      <button className="admin-logout" onClick={logout}>Sign out</button>
    </aside>
    <section className="admin-main">
      <header className="admin-header"><div><span className="admin-eyebrow">JOHDEN BUSINESS CONSULTANCY SERVICES</span><h1>{tab === "overview" ? "Website overview" : tab === "clients" ? "Clients & logos" : "Customer feedback"}</h1><p>Manage the public website from one secure workspace.</p></div><a href="/" target="_blank" rel="noreferrer">View website ↗</a></header>
      {error && <p className="admin-error admin-notice" role="alert">{error}</p>}
      {notice && <p className="admin-success admin-notice" role="status">{notice}</p>}
      {tab === "overview" && <><div className="admin-stat-grid"><article><span>Client organizations</span><strong>{clients.length}</strong><small>{clients.filter(c => c.is_published).length} published on website</small></article><article><span>Feedback submissions</span><strong>{feedback.length}</strong><small>{feedback.filter(f => f.status === "pending").length} awaiting review</small></article><article><span>Approved testimonials</span><strong>{feedback.filter(f => f.status === "approved").length}</strong><small>Visible on the feedback page</small></article></div><div className="admin-panel"><h2>Start managing your website</h2><p>Add client organizations with their logos and official websites, then publish them when you are ready. Review feedback before approving it for public display.</p><button onClick={() => setTab("clients")}>Manage clients</button><button className="secondary" onClick={() => setTab("feedback")}>Review feedback</button></div></>}
      {tab === "clients" && <div className="admin-columns"><form className="admin-panel admin-client-form" onSubmit={saveClient}><h2>Add a client</h2><p>New clients are saved as hidden until you publish them.</p><label>Organization name<input value={name} onChange={e => setName(e.target.value)} required maxLength={120}/></label><label>Upload client logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={uploadLogo} disabled={uploadingLogo}/><small className="admin-field-help">{uploadingLogo ? "Uploading logo…" : "JPG, PNG, WebP or SVG · maximum 5 MB"}</small></label><label>Logo image URL<input type="url" placeholder="Upload a logo above or paste an https:// image URL" value={logo} onChange={e => setLogo(e.target.value)} required/></label>{logo && <div className="admin-logo-preview"><img src={logo} alt="Client logo preview"/><span>Logo preview</span></div>}<label>Official website URL<input type="url" placeholder="https://example.com" value={website} onChange={e => setWebsite(e.target.value)}/></label><label>Short description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={3}/></label><button type="submit">Save client</button></form><div className="admin-panel"><h2>Client directory</h2>{clients.length === 0 ? <p>No clients added yet.</p> : <div className="admin-list">{clients.map(client => <article key={client.id} className="admin-list-item"><img src={client.logo_url} alt="" loading="lazy"/><div className="admin-list-copy"><strong>{client.name}</strong><span>{client.website_url || "No website link added"}</span><small>{client.is_published ? "Published" : "Hidden"}</small></div><button className="secondary" onClick={() => void toggleClient(client)}>{client.is_published ? "Hide" : "Publish"}</button><button className="danger" onClick={() => void removeClient(client)}>Remove</button></article>)}</div>}</div></div>}
      {tab === "feedback" && <div className="admin-panel"><h2>Feedback submissions</h2><p>Only approved feedback is shown publicly.</p>{feedback.length === 0 ? <p>No submissions yet.</p> : <div className="admin-feedback-list">{feedback.map(item => <article key={item.id} className="admin-feedback-item"><div className="admin-feedback-meta"><strong>{item.name || "Customer"}</strong><span>{item.service}</span><span className={`admin-status ${item.status}`}>{item.status}</span><time>{new Date(item.created_at).toLocaleDateString()}</time></div><p>{item.message}</p><div className="admin-actions"><button onClick={() => void setFeedbackStatus(item, "approved")}>Approve</button><button className="secondary" onClick={() => void setFeedbackStatus(item, "pending")}>Set pending</button><button className="danger" onClick={() => void setFeedbackStatus(item, "rejected")}>Reject</button></div></article>)}</div>}</div>}
    </section>
  </main>;
}
