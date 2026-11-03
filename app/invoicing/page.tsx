import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Online Invoicing & Billing Software",
  description: "Create professional invoices, manage customers and expenses, and track payments with Johden's business billing platform.",
};

const features = [
  { number: "01", title: "Professional invoices", description: "Prepare clear, branded invoices with line items, taxes, due dates and multiple currencies." },
  { number: "02", title: "Customer management", description: "Keep client details organised and find the information you need without scattered spreadsheets." },
  { number: "03", title: "Expenses and payments", description: "Record business expenses, monitor what customers owe and follow payment progress." },
  { number: "04", title: "Recurring billing", description: "Set up repeat invoice schedules and review drafts before they are sent to customers." },
  { number: "05", title: "Reports and insights", description: "Understand outstanding balances, revenue activity and business performance in one workspace." },
  { number: "06", title: "Multiple currencies", description: "Work with different currencies, with UGX as the default base currency." },
];

export default function InvoicingPage() {
  return (
    <main className="inner-page invoice-product-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/invoicing" aria-current="page">Invoicing</a><a href="/contact">Contact</a>
        </nav>
        <a className="button button-secondary header-cta" href="#account-access">Sign in / Create account</a>
      </header>

      <section className="inner-hero invoice-product-hero">
        <span className="eyebrow dark"><i /> JOH DEN BUSINESS TOOLS</span>
        <h1>Invoices, expenses and payments. <em>All in one place.</em></h1>
        <p>Spend less time chasing paperwork and more time running your business. Johden's billing workspace is being developed for businesses, consultants and growing teams.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="#account-access">Get started <span>↗</span></a>
          <a className="button button-secondary" href="#features">Explore features</a>
        </div>
        <div className="invoice-product-trust"><span>✓ Multi-currency workflows</span><span>✓ Customer and supplier records</span><span>✓ Invoice and expense tracking</span></div>
      </section>

      <section className="inner-content" id="features">
        <div className="section-heading">
          <div><span className="eyebrow dark">BUILT FOR EVERYDAY BUSINESS</span><h2>Manage the money side of <em>your work.</em></h2></div>
          <p>Tools for the daily financial tasks that keep a business moving, designed to grow with your needs.</p>
        </div>
        <div className="invoice-feature-grid">
          {features.map((feature) => <article className="invoice-feature-card" key={feature.number}>
            <span className="invoice-feature-number">{feature.number}</span>
            <h3>{feature.title}</h3><p>{feature.description}</p>
          </article>)}
        </div>
      </section>

      <section className="invoice-product-band">
        <div><span className="eyebrow"><i /> SIMPLE WORKFLOWS, BETTER VISIBILITY</span><h2>Your business finances, <em>with more clarity.</em></h2><p>Prepare invoices, keep an eye on outstanding balances and organise routine finance work in a dedicated workspace.</p></div>
        <a className="button button-light" href="#account-access">Join the platform <span>↗</span></a>
      </section>

      <section className="invoice-access-section" id="account-access">
        <div><span className="eyebrow dark"><i /> YOUR BUSINESS WORKSPACE</span><h2>Ready to manage your <em>invoicing?</em></h2><p>Account registration, secure company workspaces and subscription billing are being prepared for public launch. We will open self-service access after those controls are completed and tested.</p></div>
        <div className="invoice-access-card">
          <h3>Access options</h3>
          <p>Existing JBCS internal access remains separate while the multi-company customer portal is prepared.</p>
          <a className="button button-primary" href="/contact?service=invoicing">Request early access <span>↗</span></a>
          <a className="invoice-access-link" href="https://wa.me/256702846597?text=Hello%20Johden%2C%20I%20am%20interested%20in%20your%20online%20invoicing%20platform." target="_blank" rel="noopener noreferrer">Ask us on WhatsApp ↗</a>
          <small>Self-service sign-up and paid plans will be enabled after account isolation, permissions and subscription payments are implemented.</small>
        </div>
      </section>

      <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span><a href="/">Back to Johden home ↑</a></div></footer>
    </main>
  );
}
