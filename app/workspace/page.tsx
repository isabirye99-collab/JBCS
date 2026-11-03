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
      <span className="admin-eyebrow">JOHDEN BUSINESS TOOLS</span><h1>Workspace setup is pending</h1>
      <p>Your account is signed in, but no active business workspace is available for it. Contact Johden support so the account can be checked securely.</p>
      <Link className="invoice-access-link" href="/invoicing">Return to invoicing</Link>
    </section></main>;
  }
  return <main className="inner-page invoice-product-page">
    <header className="site-header">
      <Link className="brand" href="/">Johden Business Tools</Link>
      <nav className="desktop-nav"><Link href="/invoicing">Invoicing</Link><Link href="/contact">Support</Link></nav>
      <form action="/api/saas/logout" method="post"><button className="button button-secondary" formAction="/api/saas/logout">Sign out</button></form>
    </header>
    <section className="inner-hero invoice-product-hero">
      <span className="eyebrow dark"><i /> YOUR PRIVATE WORKSPACE</span>
      <h1>Welcome to your <em>business workspace.</em></h1>
      <p>Signed in as {session.user.email}. Your company data is kept within the workspace memberships assigned to your account.</p>
    </section>
    <section className="inner-content">
      <div className="invoice-feature-grid">
        {workspaces.map((membership: any) => {
          const workspace = membership.business_workspaces;
          const subscriptionValue = workspace.workspace_subscriptions;
          const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;
          const trialEnded = subscription?.status === "trialing" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at).getTime() <= Date.now();
          return <article className="invoice-feature-card" key={workspace.id}>
            <span className="invoice-product-trust">ROLE: {membership.role}</span>
            <h3>{workspace.name}</h3>
            <p>Workspace currency: {workspace.base_currency || "UGX"}</p>
            <p>Subscription: {trialEnded ? "Trial period ended" : subscription?.status || "No subscription record"}</p>
            <p>Billing: annual, {subscription?.billing_currency || "UGX"}</p>
            {subscription?.trial_ends_at && <p>Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString("en-GB", { dateStyle: "medium", timeZone: "Africa/Kampala" })}</p>}
            <small>Customer invoicing and paid subscription checkout will be enabled after tenant-aware finance APIs and a payment provider are configured and tested.</small>
          </article>;
        })}
      </div>
    </section>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services</span><Link href="/invoicing">Back to invoicing</Link></div></footer>
  </main>;
}
