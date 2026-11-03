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
      <Link href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={230} height={78} priority style={{width:"230px",height:"auto"}} /></Link>
      <span className="admin-eyebrow">YOUR PRIVATE WORKSPACE</span>
      <h1>Workspace setup is pending</h1>
      <p>Your account is signed in, but no active business workspace is available for it. Contact Johden support so the account can be checked securely.</p>
      <Link className="button button-primary" href="/invoicing">Return to invoicing</Link>
    </section></main>;
  }

  return <main className="inner-page invoice-product-page">
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Johden Business Consultancy Services home">
        <Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={250} height={85} priority style={{width:"250px",height:"auto"}} />
      </Link>
      <nav className="desktop-nav"><Link href="/invoicing">Invoicing</Link><Link href="/contact">Support</Link></nav>
      <form action="/api/saas/logout" method="post"><button className="button button-secondary" formAction="/api/saas/logout">Sign out</button></form>
    </header>
    <section className="inner-hero invoice-product-hero">
      <span className="eyebrow dark"><i /> YOUR PRIVATE WORKSPACE</span>
      <h1>Welcome to your <em>business workspace.</em></h1>
      <p>Signed in as {session.user.email}. Manage your billing and finance tools inside your private company workspace.</p>
    </section>
    <section className="inner-content">
      <div className="invoice-feature-grid">
        {workspaces.map((membership: any) => {
          const workspace = membership.business_workspaces;
          const subscriptionValue = workspace.workspace_subscriptions;
          const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;
          const trialEnded = subscription?.status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at).getTime() <= Date.now();
          return <article className="invoice-feature-card" key={workspace.id} style={{display:"flex",flexDirection:"column",gap:12}}>
            <span className="invoice-product-trust">WORKSPACE ROLE: {membership.role}</span>
            <h3>{workspace.name}</h3>
            <p>Workspace currency: {workspace.base_currency || "UGX"}</p>
            <p>Subscription: {trialEnded ? "Trial period ended" : subscription?.status || "No subscription record"}</p>
            <p>Billing plan: annual · {subscription?.billing_currency || "UGX"}</p>
            {subscription?.trial_ends_at && <p>Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "Africa/Kampala" })}</p>}
            <div style={{marginTop:"auto",paddingTop:8}}>
              <Link className="button button-primary" href="/workspace/finance" style={{width:"100%",justifyContent:"center"}}>Open Billing &amp; Finance <span>↗</span></Link>
              <p style={{fontSize:12,marginTop:12}}>Create customer records, prepare invoices, print or save invoices as PDF, and record business expenses.</p>
            </div>
          </article>;
        })}
      </div>
      <section className="invoice-feature-card" style={{marginTop:24,background:"#fff8f7",borderColor:"#f5e1e2"}}>
        <span className="eyebrow dark"><i /> BILLING &amp; FINANCE</span>
        <h2 style={{fontFamily:"Manrope, sans-serif",margin:"12px 0"}}>Your finance tools are ready to open</h2>
        <p style={{color:"#69666b",maxWidth:680}}>Go to your finance workspace to manage customers, create draft invoices, view and print invoices, and record expenses. Online payment collection, automatic email delivery, and paid subscription checkout are not enabled yet.</p>
        <Link className="button button-primary" href="/workspace/finance">Go to Billing &amp; Finance <span>↗</span></Link>
      </section>
    </section>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services</span><Link href="/invoicing">Back to invoicing</Link></div></footer>
  </main>;
}
