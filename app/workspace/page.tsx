import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSaasSession, getWorkspaceForUser } from "@/lib/saas-auth";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await getSaasSession();
  if (!session) redirect("/login");
  const workspaces = await getWorkspaceForUser(session.user.id);

  if (!workspaces || workspaces.length === 0) {
    return <main className="admin-login-shell"><section className="admin-login-card">
      <Link href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={230} height={78} priority style={{ width: "230px", height: "auto" }} /></Link>
      <span className="eyebrow dark" style={{ marginTop: 24 }}>YOUR PRIVATE WORKSPACE</span>
      <h1>Workspace setup is pending</h1>
      <p>Your account is signed in, but no active business workspace is available for it. Contact Johden support so the account can be checked securely.</p>
      <Link className="button button-primary" href="/technology">Return to Johden website</Link>
    </section></main>;
  }

  return <main className="inner-page invoice-product-page" style={{ background: "#faf8f8" }}>
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Johden Business Consultancy Services home">
        <Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={250} height={85} priority style={{ width: "230px", height: "auto" }} />
      </Link>
      <nav className="desktop-nav"><Link href="/workspace">Workspace</Link><Link href="/technology">Product site</Link><Link href="/contact">Support</Link></nav>
      <form action="/api/saas/logout" method="post"><button className="button button-secondary" formAction="/api/saas/logout">Sign out</button></form>
    </header>

    <section style={{ padding: "clamp(36px,6vw,76px) 7% 48px", background: "linear-gradient(120deg,#fff7f5 0%,#fff 58%,#fff0ed 100%)", borderBottom: "1px solid #f0e5e5" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(240px,.8fr)", gap: 36, alignItems: "center" }}>
        <div>
          <span className="eyebrow dark"><i /> JOHDEN BUSINESS SUITE</span>
          <h1 style={{ fontFamily: "Manrope,sans-serif", fontSize: "clamp(38px,5vw,62px)", lineHeight: 1.08, letterSpacing: "-.05em", maxWidth: 720, margin: "20px 0 18px" }}>Your business. <em style={{ color: "#f3192d", fontStyle: "normal" }}>One organised workspace.</em></h1>
          <p style={{ color: "#69666b", maxWidth: 610, fontSize: 16, lineHeight: 1.85, margin: 0 }}>Welcome back, {session.user.email}. Manage customer records, prepare invoices and keep your business expenses together in one secure place.</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
            <Link className="button button-primary" href="#available-workspaces">Choose a Workspace <span>↓</span></Link>
            <Link className="button button-secondary" href="/contact">Get support</Link>
          </div>
        </div>
        <div aria-hidden="true" style={{ background: "#292428", borderRadius: 18, padding: 24, color: "#fff", boxShadow: "0 22px 55px #3c172015", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 190, height: 190, borderRadius: "50%", background: "#f3192d", opacity: .18, right: -70, top: -80 }} />
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".16em", color: "#ff9aa3" }}>YOUR WORKSPACE</div>
          <div style={{ fontFamily: "Manrope,sans-serif", fontSize: 25, fontWeight: 800, marginTop: 12 }}>Business tools, simplified.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24, position: "relative" }}>
            <div style={{ border: "1px solid #ffffff20", background: "#ffffff0c", borderRadius: 10, padding: 14 }}><div style={{ color: "#ff9aa3", fontSize: 20 }}>▤</div><b style={{ display: "block", marginTop: 7, fontSize: 13 }}>Invoicing</b><small style={{ color: "#d0c7cb", fontSize: 11 }}>Create &amp; print</small></div>
            <div style={{ border: "1px solid #ffffff20", background: "#ffffff0c", borderRadius: 10, padding: 14 }}><div style={{ color: "#ffb36d", fontSize: 20 }}>◉</div><b style={{ display: "block", marginTop: 7, fontSize: 13 }}>Customers</b><small style={{ color: "#d0c7cb", fontSize: 11 }}>Keep records</small></div>
            <div style={{ border: "1px solid #ffffff20", background: "#ffffff0c", borderRadius: 10, padding: 14 }}><div style={{ color: "#ffb36d", fontSize: 20 }}>↗</div><b style={{ display: "block", marginTop: 7, fontSize: 13 }}>Expenses</b><small style={{ color: "#d0c7cb", fontSize: 11 }}>Track spending</small></div>
            <div style={{ border: "1px solid #ffffff20", background: "#ffffff0c", borderRadius: 10, padding: 14 }}><div style={{ color: "#ff9aa3", fontSize: 20 }}>✓</div><b style={{ display: "block", marginTop: 7, fontSize: 13 }}>Your records</b><small style={{ color: "#d0c7cb", fontSize: 11 }}>In one place</small></div>
          </div>
        </div>
      </div>
    </section>

    <section id="available-workspaces" style={{ maxWidth: 1180, margin: "0 auto", padding: "38px 7% 72px" }}>
      <div style={{ marginBottom: 22 }}>
        <span className="eyebrow dark"><i /> AVAILABLE WORKSPACES</span>
        <h2 style={{ fontFamily: "Manrope,sans-serif", fontSize: 30, letterSpacing: "-.035em", margin: "8px 0 5px" }}>Choose where to work</h2>
        <p style={{ color: "#69666b", margin: 0 }}>Your authorised business workspaces and tools.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 18 }}>
        {workspaces.map((membership: any) => {
          const workspace = membership.business_workspaces;
          const subscriptionValue = workspace.workspace_subscriptions;
          const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;
          const trialEnded = subscription?.status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at).getTime() <= Date.now();
          return <article key={workspace.id} style={{ background: "#fff", border: "1px solid #ece4e4", borderRadius: 14, padding: 25, boxShadow: "0 8px 28px #30232808", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontSize: 10, letterSpacing: ".12em", fontWeight: 800, color: "#a91b2b" }}>BUSINESS WORKSPACE</span>
              <span style={{ borderRadius: 30, padding: "5px 10px", background: "#fff0ed", color: "#a91b2b", fontSize: 10, fontWeight: 800 }}>{membership.role}</span>
            </div>
            <h3 style={{ font: "800 24px/1.25 Manrope,sans-serif", letterSpacing: "-.03em", margin: "3px 0" }}>{workspace.name}</h3>
            <p style={{ color: "#69666b", margin: 0, fontSize: 13 }}>Base currency <strong style={{ color: "#292428" }}>{workspace.base_currency || "UGX"}</strong></p>
            <div style={{ borderTop: "1px solid #f0eaea", paddingTop: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><small style={{ display: "block", color: "#81787d", fontSize: 10 }}>SUBSCRIPTION</small><strong style={{ fontSize: 12 }}>{trialEnded ? "Trial ended" : subscription?.status || "Not configured"}</strong></div>
              <div><small style={{ display: "block", color: "#81787d", fontSize: 10 }}>BILLING PLAN</small><strong style={{ fontSize: 12 }}>Annual · {subscription?.billing_currency || "UGX"}</strong></div>
            </div>
            {subscription?.trial_ends_at && <p style={{ color: "#69666b", fontSize: 12, margin: 0 }}>Trial ends {new Date(subscription.trial_ends_at).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "Africa/Kampala" })}</p>}
            <form action="/api/saas/select-workspace" method="post" style={{ marginTop: "auto" }}><input type="hidden" name="workspace_id" value={workspace.id} /><button className="button button-primary" type="submit" style={{ width: "100%" }}>Select this Workspace <span>↗</span></button></form>
          </article>;
        })}
      </div>
      <div style={{ marginTop: 24, border: "1px solid #f1dada", background: "#fff", borderRadius: 14, padding: "22px 25px", display: "flex", gap: 18, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div><strong style={{ fontFamily: "Manrope,sans-serif", fontSize: 17 }}>Need help with your workspace?</strong><p style={{ color: "#69666b", fontSize: 13, margin: "4px 0 0" }}>Contact support if access, billing or account settings need attention.</p></div>
        <Link className="button button-secondary" href="/contact">Contact support <span>↗</span></Link>
      </div>
    </section>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services</span><Link href="/technology">Back to Johden website</Link></div></footer>
    <style>{`@media(max-width:760px){.workspace-hero-grid{grid-template-columns:1fr!important}}`}</style>
  </main>;
}
