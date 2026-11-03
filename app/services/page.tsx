import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Our Services" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-primary header-cta" href="/contact">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> SERVICES THAT MOVE YOU FORWARD</div><h1>Our <em>Services</em></h1><p>Practical support across business strategy, marketing, technology, research and creative delivery.</p></section>
      <section className="inner-content">
        <div className="inner-cards"><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=85)"}} /><b>01</b><h2>Business Consultancy</h2><p>Business plans, feasibility studies, strategy, proposals and business development support.</p></article><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=800&q=85)"}} /><b>02</b><h2>Marketing & Branding</h2><p>Brand identity, digital marketing, campaign planning, social media and online visibility.</p></article><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=85)"}} /><b>03</b><h2>Software & Technology</h2><p>Websites, custom business applications, CRM, billing systems and workflow automation.</p></article><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=85)"}} /><b>04</b><h2>Research & Analytics</h2><p>Research design, data analysis, monitoring and evaluation, dashboards and reporting.</p></article><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=800&q=85)"}} /><b>05</b><h2>Creative & Corporate</h2><p>Company profiles, proposals, reports, presentations and event branding.</p></article><article><div className="inner-card-photo" role="img" aria-label="Service photography" style={{backgroundImage:"url(https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=85)"}} /><b>06</b><h2>Business Support</h2><p>Documentation, tender support, project planning and operational process improvement.</p></article></div>
        <a className="button button-secondary" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><a className="footer-logo" href="/"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={250} height={85} /></a><p>Strategy. Growth. Technology.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></div><small>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</small></footer>
    </main>
  );
}
