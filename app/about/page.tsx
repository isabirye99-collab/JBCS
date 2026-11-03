import type { Metadata } from "next";

export const metadata: Metadata = { title: "About Johden" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-dark header-cta" href="/contact">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> WHO WE ARE</div><h1>About <em>Johden</em></h1><p>A multidisciplinary business consultancy focused on helping organisations turn ideas into clear plans, useful tools and meaningful progress.</p></section>
      <section className="inner-content">
        <div className="inner-two"><article><h2>Our approach</h2><p>We bring business thinking, creative communication and technology together to help organisations solve practical problems and pursue sustainable growth.</p></article><article><h2>What guides us</h2><p><strong>Listen first.</strong> Understand the real need. <strong>Keep it practical.</strong> Make recommendations that can be put to work. <strong>Focus on value.</strong> Build solutions that support meaningful progress.</p></article></div>
        <a className="button button-outline" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><a className="brand footer-brand" href="/"><span className="brand-mark">J<span>.</span></span><span className="brand-copy"><strong>JOHDEN</strong><small>BUSINESS CONSULTANCY SERVICES</small></span></a><p>Strategy. Growth. Technology.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/contact">Contact</a></div><small>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</small></footer>
    </main>
  );
}
