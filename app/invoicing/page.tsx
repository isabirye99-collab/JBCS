import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Johden Business Tools | Invoicing for Growing Businesses",
  description: "Organise customers, prepare draft invoices, print professional invoice PDFs and record expenses in one business workspace.",
};

const available = [
  { number: "01", title: "Keep customer details together", description: "Create a customer list with names and email addresses, ready to use when preparing an invoice." },
  { number: "02", title: "Prepare clear invoices", description: "Choose a customer, add line items, quantity, price, tax and a due date, then save your invoice as a draft." },
  { number: "03", title: "Print or save as PDF", description: "Open a draft invoice in a print-friendly view and save a copy as PDF for your records or to share yourself." },
  { number: "04", title: "Record everyday expenses", description: "Log expense categories, amounts, dates, payment methods and currencies in your private workspace." },
  { number: "05", title: "Work across currencies", description: "Prepare records in UGX, USD, EUR, GBP, KES and TZS. Subscription billing preference is selected separately." },
  { number: "06", title: "A separate workspace for your business", description: "Your company records are tied to your own workspace membership rather than another customer's workspace." },
];

export default function InvoicingPage() {
  return (
    <main className="inner-page invoice-product-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/invoicing" aria-current="page">Invoicing</a><a href="/contact">Contact</a>
        </nav>
        <a className="button button-secondary header-cta" href="/login">Sign in</a>
      </header>

      <section className="inner-hero invoice-product-hero">
        <span className="eyebrow dark"><i /> JOHDEN BUSINESS TOOLS</span>
        <h1>Less paperwork. <em>More clarity.</em></h1>
        <p>Keep your customers, draft invoices and everyday expenses organised in one place. Johden Business Tools is designed for consultants, small businesses and growing teams that want a simpler finance routine.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="/login">Create your workspace <span>↗</span></a>
          <a className="button button-secondary" href="#how-it-works">See how it works</a>
        </div>
        <div className="invoice-product-trust"><span>✓ Multi-currency records</span><span>✓ Private business workspace</span></div>
        <div className="inner-hero-visual invoicing-hero-visual" role="img" aria-label="Professional business team reviewing invoices and financial records" style={{backgroundImage:"linear-gradient(180deg,rgba(38,35,38,.02) 20%,rgba(38,35,38,.78) 100%),url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=90)"}}><div className="inner-hero-visual-caption"><span>JOHDEN BUSINESS TOOLS</span><strong>Clarity for every business decision.</strong></div></div>
      </section>

      <section className="inner-content" id="how-it-works">
        <div className="section-heading">
          <div><span className="eyebrow dark">A SIMPLE PLACE TO START</span><h2>Your everyday finance tasks, <em>in one workflow.</em></h2></div>
          <p>Start with the essentials and build a reliable record of customers, invoices and expenses as your business grows.</p>
        </div>
        <div className="invoice-feature-grid">
          {available.map((feature) => <article className="invoice-feature-card" key={feature.number}>
            <span className="invoice-feature-number">{feature.number}</span>
            <h3>{feature.title}</h3><p>{feature.description}</p>
          </article>)}
        </div>
      </section>

      <section className="invoice-product-band">
        <div><span className="eyebrow"><i /> GET STARTED AT YOUR OWN PACE</span><h2>Set up your business workspace <em>in a few steps.</em></h2><p>Create an account, confirm your email if requested, and sign in to add your first customer. Your workspace keeps your customer, invoice and expense records together.</p></div>
        <a className="button button-light" href="/login">Create account <span>↗</span></a>
      </section>

      <section className="invoice-access-section" id="account-access">
        <div><span className="eyebrow dark"><i /> CLEAR ABOUT WHAT'S READY</span><h2>Start with the essentials. <em>Grow from there.</em></h2><p>Customer records, draft invoice creation, print/PDF and expense recording are the initial workflows. Automated email delivery and online payment collection are not yet enabled.</p></div>
        <div className="invoice-access-card">
          <h3>Your business, your workspace</h3>
          <p>New here? Create an account for your company. Already registered? Sign in with your existing email and password.</p>
          <a className="button button-primary" href="/login">Continue to account access <span>↗</span></a>
          <a className="invoice-access-link" href="https://wa.me/256702846597?text=Hello%20Johden%2C%20I%20need%20help%20with%20the%20invoicing%20platform." target="_blank" rel="noopener noreferrer">Questions? Contact Johden on WhatsApp ↗</a>
          <small>Account creation does not collect a payment. Please contact support if you cannot sign in or if your workspace setup appears incomplete.</small>
        </div>
      </section>

      <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span><a href="/">Back to Johden home ↑</a></div></footer>
    </main>
  );
}
