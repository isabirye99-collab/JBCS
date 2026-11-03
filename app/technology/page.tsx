import type { Metadata } from "next";

export const metadata: Metadata = { title: "Technology Solutions" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-dark header-cta" href="/contact">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> TECHNOLOGY THAT WORKS FOR YOU</div><h1>Technology <em>Solutions</em></h1><p>Digital experiences and business systems designed around the way your organisation actually works.</p></section>
      <section className="inner-content">
        <div className="inner-cards"><article><b>01</b><h2>Websites & Digital Presence</h2><p>Responsive websites that introduce your organisation, communicate your value and help customers take action.</p></article><article><b>02</b><h2>Business Software</h2><p>Custom systems for invoicing, billing, expense tracking, customer management and everyday operations.</p></article><article><b>03</b><h2>Data & Automation</h2><p>Dashboards, reporting and connected workflows that reduce repetitive work and improve visibility.</p></article></div>
        <a className="button button-outline" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a><p>Strategy. Growth. Technology.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></div><small>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</small></footer>
    </main>
  );
}
