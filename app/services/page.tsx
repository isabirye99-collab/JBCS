import type { Metadata } from "next";

export const metadata: Metadata = { title: "Our Services" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-dark header-cta" href="/contact">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> SERVICES THAT MOVE YOU FORWARD</div><h1>Our <em>Services</em></h1><p>Practical support across business strategy, marketing, technology, research and creative delivery.</p></section>
      <section className="inner-content">
        <div className="inner-cards"><article><b>01</b><h2>Business Consultancy</h2><p>Business plans, feasibility studies, strategy, proposals and business development support.</p></article><article><b>02</b><h2>Marketing & Branding</h2><p>Brand identity, digital marketing, campaign planning, social media and online visibility.</p></article><article><b>03</b><h2>Software & Technology</h2><p>Websites, custom business applications, CRM, billing systems and workflow automation.</p></article><article><b>04</b><h2>Research & Analytics</h2><p>Research design, data analysis, monitoring and evaluation, dashboards and reporting.</p></article><article><b>05</b><h2>Creative & Corporate</h2><p>Company profiles, proposals, reports, presentations and event branding.</p></article><article><b>06</b><h2>Business Support</h2><p>Documentation, tender support, project planning and operational process improvement.</p></article></div>
        <a className="button button-outline" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a><p>Strategy. Growth. Technology.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></div><small>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</small></footer>
    </main>
  );
}
