import type { Metadata } from "next";

export const metadata: Metadata = { title: "Let’s Talk" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-dark header-cta" href="/contact">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> START A CONVERSATION</div><h1>Let’s <em>Talk</em></h1><p>Share your goals with Johden and let’s explore how we can help you take the next step.</p></section>
      <section className="inner-content">
        <div className="contact-panel"><h2>Tell us what you’re working on.</h2><p>We’ll help you identify a practical next step for your business, brand, research or technology project.</p><a className="button button-gold" href="https://johden.my.canva.site/" target="_blank" rel="noreferrer">Contact Johden ↗</a><p className="contact-note">Until official contact details are confirmed, this link opens the existing Johden website.</p></div>
        <a className="button button-outline" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a><p>Strategy. Growth. Technology.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></div><small>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</small></footer>
    </main>
  );
}
