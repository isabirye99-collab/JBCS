import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "About Johden" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about">About</a><a href="/services">Services</a><a href="/technology">Technology</a><a href="/contact">Contact</a></nav>
        <a className="button button-primary header-cta" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> WHO WE ARE</div><h1>About <em>Johden</em></h1><p>A multidisciplinary business consultancy focused on helping organisations turn ideas into clear plans, useful tools and meaningful progress.</p></section>
      <section className="inner-content">
        <div className="inner-two"><article><div className="inner-wide-photo" role="img" aria-label="Business people collaborating" style={{backgroundImage:"url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85)"}} /><h2>Our approach</h2><p>We bring business thinking, creative communication and technology together to help organisations solve practical problems and pursue sustainable growth.</p></article><article><div className="inner-wide-photo" role="img" aria-label="Professional planning meeting" style={{backgroundImage:"url(https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=85)"}} /><h2>What guides us</h2><p><strong>Listen first.</strong> Understand the real need. <strong>Keep it practical.</strong> Make recommendations that can be put to work. <strong>Focus on value.</strong> Build solutions that support meaningful progress.</p></article></div>
        <a className="button button-secondary" href="/contact">Discuss your project ↗</a>
      </section>
      <footer className="site-footer"><div className="footer-main"><a className="footer-logo" href="/"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={250} height={85} /></a><p>Strategy. Growth. Technology.<br/>For academics and business solutions.</p><div className="footer-links"><a href="/">Home</a><a href="/services">Services</a><a href="/about">About</a><a href="/technology">Technology</a><a href="/contact">Contact</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span><span>Business. Creativity. Technology.</span></div></footer>
    </main>
  );
}
