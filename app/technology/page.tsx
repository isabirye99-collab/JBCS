import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "Technology Solutions" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/technology" aria-current="page">Technology</a>
          <a href="/contact">Contact</a>
        </nav>
        <a className="button button-primary header-cta" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> TECHNOLOGY THAT WORKS FOR YOU</div><h1>Technology <em>Solutions</em></h1><p>Digital experiences and business systems designed around the way your organisation actually works.</p><div className="inner-hero-visual technology-hero-visual" role="img" aria-label="Technology professionals working with digital tools" style={{backgroundImage:"linear-gradient(180deg,rgba(38,35,38,.02) 20%,rgba(38,35,38,.76) 100%),url(https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=90)"}}><div className="inner-hero-visual-caption"><span>SMARTER WAYS TO WORK</span><strong>Technology that moves business forward.</strong></div></div></section>
      <section className="inner-content">
        <div className="inner-cards"><article><div className="inner-card-photo" role="img" aria-label="Billing and invoicing software dashboard" style={{backgroundImage:"url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=85)"}} /><b>01</b><h2>Billing Software</h2><p>Manage customers, quotations, invoices, receivables, payments, expenses and financial reports in one secure business workspace.</p><a className="button button-primary" href="/login">Open Billing Software ↗</a></article><article><div className="inner-card-photo" role="img" aria-label="Clinic management software" style={{backgroundImage:"url(https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=85)"}} /><b>02</b><h2>Clinic Management Software</h2><p>Organise clinic operations, patient workflows, appointments and service records through a dedicated digital workspace.</p><a className="button button-primary" href="/login?next=%2Fworkspace%2Fclinic">Open Clinic Software ↗</a></article><article><div className="inner-card-photo" role="img" aria-label="Websites and digital technology" style={{backgroundImage:"url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=85)"}} /><b>03</b><h2>Websites & Digital Presence</h2><p>Responsive websites that introduce your organisation, communicate your value and help customers take action.</p></article><article><div className="inner-card-photo" role="img" aria-label="Data and automation" style={{backgroundImage:"url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=85)"}} /><b>04</b><h2>Data & Automation</h2><p>Dashboards, reporting and connected workflows that reduce repetitive work and improve visibility.</p></article></div>
        <a className="button button-secondary" href="/contact">Discuss your project ↗</a>
      </section>
      <div className="footer-service-strip" aria-label="Johden core service areas"><span>BUSINESS STRATEGY</span><i aria-hidden="true"/><span>BRAND &amp; MARKETING</span><i aria-hidden="true"/><span>SOFTWARE SOLUTIONS</span><i aria-hidden="true"/><span>RESEARCH &amp; INSIGHT</span></div>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span></div></footer>
    </main>
  );
}
