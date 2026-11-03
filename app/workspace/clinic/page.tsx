import Link from "next/link";
import { redirect } from "next/navigation";
import { getClinicContext } from "@/lib/clinic-context";
import PatientRegistrationForm from "@/components/clinic/PatientRegistrationForm";
import AppointmentForm from "@/components/clinic/AppointmentForm";
import ClinicChargeForm from "@/components/clinic/ClinicChargeForm";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;
const money = (value: unknown) => new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(Number(value || 0));

async function rows(url: string, key: string, path: string): Promise<Row[]> {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export default async function ClinicWorkspacePage() {
  const ctx = await getClinicContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login");
    return <main className="inner-page invoice-product-page" style={{ minHeight: "100vh", padding: "8vw", background: "#f8f7f6" }}>
      <section style={{ maxWidth: 650, margin: "0 auto", background: "#fff", border: "1px solid #eee2e0", borderRadius: 18, padding: 32 }}>
        <span style={{ color: "#ad1d2e", fontWeight: 800, letterSpacing: ".12em", fontSize: 11 }}>JOHDEN · CLINIC WORKSPACE</span>
        <h1 style={{ fontSize: 32, margin: "16px 0 10px" }}>Johnpaul Medical Center</h1>
        <p>{ctx.error}</p>
        <Link className="button button-secondary" href="/workspace">Return to business workspace</Link>
      </section>
    </main>;
  }

  const wid = encodeURIComponent(ctx.workspaceId);
  const [patients, patientDirectory, appointments, charges, receipts, inventory] = await Promise.all([
    rows(ctx.url, ctx.serviceKey, `patients?workspace_id=eq.${wid}&select=id,patient_number,full_name,phone,created_at&order=created_at.desc&limit=8`),
    rows(ctx.url, ctx.serviceKey, `patients?workspace_id=eq.${wid}&select=id,patient_number,full_name&order=full_name.asc&limit=500`),
    rows(ctx.url, ctx.serviceKey, `clinic_appointments?workspace_id=eq.${wid}&select=id,patient_id,appointment_at,status,reason&order=appointment_at.desc&limit=8`),
    rows(ctx.url, ctx.serviceKey, `clinic_charges?workspace_id=eq.${wid}&select=id,patient_id,description,quantity,unit_price,currency,status,charge_date&order=charge_date.desc&limit=1000`),
    rows(ctx.url, ctx.serviceKey, `clinic_receipts?workspace_id=eq.${wid}&select=id,patient_id,receipt_number,amount,currency,payment_method,receipt_date&order=receipt_date.desc&limit=8`),
    rows(ctx.url, ctx.serviceKey, `inventory_items?workspace_id=eq.${wid}&select=id,item_name,quantity_on_hand,reorder_level,unit,expiry_date&order=item_name.asc&limit=1000`),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayAppointments = appointments.filter(a => String(a.appointment_at || "").slice(0, 10) === today);
  const unpaidCharges = charges.filter(c => c.status === "unpaid");
  const lowStock = inventory.filter(i => Number(i.quantity_on_hand) <= Number(i.reorder_level));
  const todayReceipts = receipts.filter(r => String(r.receipt_date || "").slice(0, 10) === today);
  const patientNames = new Map(patientDirectory.map(p => [p.id, p.full_name]));

  return <main style={{ minHeight: "100vh", background: "#f7f8fa", color: "#252b36", fontFamily: "Arial, sans-serif" }}>
    <aside style={{ position: "fixed", inset: "0 auto 0 0", width: 236, padding: 24, background: "#202632", color: "#fff", display: "flex", flexDirection: "column", gap: 10, zIndex: 2 }}>
      <Link href="/workspace" style={{ color: "#fff", textDecoration: "none", fontWeight: 900, fontSize: 17 }}>JOHDEN <span style={{ color: "#ef7777" }}>CARE</span></Link>
      <small style={{ color: "#aeb6c5", marginBottom: 22 }}>JOHNPAUL MEDICAL CENTER</small>
      <span style={{ color: "#aeb6c5", fontSize: 11, fontWeight: 800 }}>CLINIC OPERATIONS</span>
      <a href="#overview" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Overview</a>
      <a href="#patients" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Patients</a>
      <a href="#appointments" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Appointments</a>
      <a href="#billing" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Patient billing</a>
      <a href="#receipts" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Cash receipts</a>
      <a href="#inventory" style={{ color: "#fff", padding: "10px 0", textDecoration: "none" }}>Medicines & supplies</a>
      <Link href="/workspace/finance" style={{ color: "#ffc6c6", marginTop: "auto", textDecoration: "none" }}>← Johden business finance</Link>
    </aside>
    <div style={{ marginLeft: 236, padding: "30px clamp(18px,4vw,48px)", maxWidth: 1600 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 30 }}>
        <div><div style={{ color: "#b42332", fontWeight: 800, fontSize: 11, letterSpacing: ".14em" }}>CLINIC MANAGEMENT</div><h1 style={{ fontSize: "clamp(28px,3vw,38px)", margin: "8px 0" }}>Clinic billing & operations</h1><p style={{ color: "#687080", margin: 0 }}>Welcome, {ctx.session.user.email}. Clinic records are isolated to this workspace.</p></div>
        <span style={{ background: "#e4f5ea", color: "#17663a", borderRadius: 30, padding: "8px 13px", fontSize: 12, fontWeight: 800 }}>Workspace verified</span>
      </header>
      {ctx.setupMode && <section role="status" style={{ marginBottom: 20, padding: 16, borderRadius: 12, border: "1px solid #f0c36d", background: "#fff8e6", color: "#694b10" }}><strong>Owner setup mode</strong><p style={{ margin: "6px 0 0" }}>You can configure the clinic and register patients without a subscription being created. No paid subscription is active. Subscription checks must remain enabled for paid features.</p></section>}
      <section id="overview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        {[
          ["Recent patients shown", patients.length, "Latest 8 patient records at most"],
          ["Appointments today", todayAppointments.length, "From recent appointment records"],
          ["Unpaid charges", unpaidCharges.length, "Outstanding charge entries"],
          ["Low-stock items", lowStock.length, "At or below reorder level"],
        ].map(([label, value, detail]) => <article key={String(label)} style={{ background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 20 }}><div style={{ color: "#687080", fontSize: 12 }}>{label}</div><strong style={{ display: "block", fontSize: 32, margin: "12px 0 6px" }}>{value}</strong><small style={{ color: "#87909e" }}>{detail}</small></article>)}
      </section>
      <section id="patients" style={{ marginTop: 24, background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Register a patient</h2>
        <p style={{ color: "#687080" }}>Create a patient record for Johnpaul Medical Center. A patient number is generated automatically.</p>
        <PatientRegistrationForm />
        <hr style={{ border: 0, borderTop: "1px solid #e7eaf0", margin: "26px 0" }} />
        <h2 style={{ marginTop: 0 }}>Recent patient registrations</h2>
        {patients.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Patient number","Name","Phone","Registered"].map(x=><th key={x} style={{ padding: 11, borderBottom: "1px solid #e7eaf0" }}>{x}</th>)}</tr></thead><tbody>{patients.map(p=><tr key={p.id}>{[p.patient_number,p.full_name,p.phone||"—",String(p.created_at||"").slice(0,10)].map((x,i)=><td key={i} style={{ padding: 11, borderBottom: "1px solid #f0f1f4" }}>{x}</td>)}</tr>)}</tbody></table></div> : <p style={{ color: "#687080" }}>No patient records are available yet in this workspace.</p>}
      </section>
      <section id="appointments" style={{ marginTop: 20, background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Schedule an appointment</h2>
        <p style={{ color: "#687080" }}>Choose a registered patient and a future date and time. Appointment records remain within Johnpaul Medical Center.</p>
        <AppointmentForm patients={patientDirectory.map(p => ({ id: p.id, patient_number: p.patient_number, full_name: p.full_name }))} />
        <hr style={{ border: 0, borderTop: "1px solid #e7eaf0", margin: "26px 0" }} />
        <h2 style={{ marginTop: 0 }}>Recent appointments</h2>
        {appointments.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Date & time","Patient","Reason","Status"].map(x=><th key={x} style={{ padding: 11, borderBottom: "1px solid #e7eaf0" }}>{x}</th>)}</tr></thead><tbody>{appointments.map(a=><tr key={a.id}><td style={{ padding: 11 }}>{new Date(a.appointment_at).toLocaleString("en-UG",{timeZone:"Africa/Kampala"})}</td><td style={{ padding: 11 }}>{patientNames.get(a.patient_id)||"Patient record"}</td><td style={{ padding: 11 }}>{a.reason||"—"}</td><td style={{ padding: 11 }}>{a.status}</td></tr>)}</tbody></table></div> : <p style={{ color: "#687080" }}>No appointment records are available yet.</p>}
      </section>
      <section id="billing" style={{ marginTop: 20, background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Add a patient charge</h2><p style={{ color: "#687080" }}>Record a service or item against a registered patient. New charges remain unpaid until a payment is recorded.</p><ClinicChargeForm patients={patientDirectory.map(p => ({ id: p.id, patient_number: p.patient_number, full_name: p.full_name }))} /><hr style={{ border: 0, borderTop: "1px solid #e7eaf0", margin: "26px 0" }} /><h2 style={{ marginTop: 0 }}>Outstanding patient charges</h2>
        {unpaidCharges.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Date","Patient","Charge","Amount","Status"].map(x=><th key={x} style={{ padding: 11, borderBottom: "1px solid #e7eaf0" }}>{x}</th>)}</tr></thead><tbody>{unpaidCharges.slice(0,30).map(c=><tr key={c.id}><td style={{ padding: 11 }}>{c.charge_date}</td><td style={{ padding: 11 }}>{patientNames.get(c.patient_id)||"Patient record"}</td><td style={{ padding: 11 }}>{c.description}</td><td style={{ padding: 11 }}>{money(Number(c.quantity)*Number(c.unit_price))}</td><td style={{ padding: 11 }}>{c.status}</td></tr>)}</tbody></table></div> : <p>No unpaid charges are available.</p>}
      </section>
      <section id="receipts" style={{ marginTop: 20, background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 22 }}><h2 style={{ marginTop: 0 }}>Recent cash receipts</h2><p style={{ color: "#687080" }}>Today’s receipts shown from saved clinic receipt records: {money(todayReceipts.reduce((sum,r)=>sum+Number(r.amount||0),0))}.</p>{receipts.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Receipt","Date","Patient","Method","Amount"].map(x=><th key={x} style={{ padding: 11, borderBottom: "1px solid #e7eaf0" }}>{x}</th>)}</tr></thead><tbody>{receipts.map(r=><tr key={r.id}><td style={{ padding: 11 }}>{r.receipt_number}</td><td style={{ padding: 11 }}>{String(r.receipt_date||"").slice(0,10)}</td><td style={{ padding: 11 }}>{patientNames.get(r.patient_id)||"Patient record"}</td><td style={{ padding: 11 }}>{r.payment_method}</td><td style={{ padding: 11 }}>{money(r.amount)}</td></tr>)}</tbody></table></div> : <p>No receipts recorded yet.</p>}</section>
      <section id="inventory" style={{ marginTop: 20, background: "#fff", border: "1px solid #e7eaf0", borderRadius: 14, padding: 22 }}><h2 style={{ marginTop: 0 }}>Medicines & supplies</h2>{inventory.length ? <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}><thead><tr>{["Item","Quantity","Reorder level","Unit","Expiry"].map(x=><th key={x} style={{ padding: 11, borderBottom: "1px solid #e7eaf0" }}>{x}</th>)}</tr></thead><tbody>{inventory.slice(0,30).map(i=><tr key={i.id}><td style={{ padding: 11 }}>{i.item_name}</td><td style={{ padding: 11 }}>{i.quantity_on_hand}</td><td style={{ padding: 11 }}>{i.reorder_level}</td><td style={{ padding: 11 }}>{i.unit}</td><td style={{ padding: 11 }}>{i.expiry_date||"—"}</td></tr>)}</tbody></table></div> : <p>No inventory items are available yet.</p>}</section>
      <footer style={{ padding: "28px 0", color: "#78808e", fontSize: 12 }}>Johnpaul Medical Center · Private clinic workspace · Financial data displayed in UGX. Confirm currency before adding multi-currency clinic services.</footer>
    </div>
    <style>{`@media(max-width:760px){aside{position:static!important;width:auto!important;inset:auto!important}main>div{margin-left:0!important;padding:20px 14px!important}}`}</style>
  </main>;
}
