import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = { title: "About Johden" };

export default function Page() {
  return (
    <main className="inner-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <a href="/about" aria-current="page">About</a>
          <a href="/technology">Technology</a>
          <a href="/contact">Contact</a>
        </nav>
        <a className="button button-primary header-cta" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Let’s talk ↗</a>
      </header>
      <section className="inner-hero"><div className="eyebrow dark-eyebrow"><span /> WHO WE ARE</div><h1>About <em>Johden</em></h1><p>A multidisciplinary business consultancy focused on helping organisations turn ideas into clear plans, useful tools and meaningful progress.</p><div className="inner-hero-visual about-hero-visual" role="img" aria-label="Professional team collaborating in a bright office" style={{backgroundImage:"linear-gradient(180deg,rgba(38,35,38,.02) 20%,rgba(38,35,38,.76) 100%),url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=90)"}}><div className="inner-hero-visual-caption"><span>BUILT AROUND YOUR GOALS</span><strong>People, ideas and practical progress.</strong></div></div></section>
      <section className="inner-content">
        <div className="inner-two"><article><div className="inner-wide-photo" role="img" aria-label="Business people collaborating" style={{backgroundImage:"url(https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85)"}} /><h2>Our approach</h2><p>We bring business thinking, creative communication and technology together to help organisations solve practical problems and pursue sustainable growth.</p></article><article><div className="inner-wide-photo" role="img" aria-label="Professional planning meeting" style={{backgroundImage:"url(https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=85)"}} /><h2>What guides us</h2><p><strong>Listen first.</strong> Understand the real need. <strong>Keep it practical.</strong> Make recommendations that can be put to work. <strong>Focus on value.</strong> Build solutions that support meaningful progress.</p></article></div>
        <section className="purpose-grid" aria-label="Our mission and vision">
          <article className="purpose-card"><span className="eyebrow dark">OUR MISSION</span><h2>Helping you move from ideas to action.</h2><p>To provide tailored, reliable and practical consultancy services that help individuals and organisations clarify their goals, solve challenges and make meaningful progress.</p></article>
          <article className="purpose-card purpose-card-vision"><span className="eyebrow dark">OUR VISION</span><h2>To be a preferred partner for your business needs.</h2><p>To be the trusted partner individuals and organisations turn to for thoughtful advice, creative solutions and dependable support throughout their growth journey.</p></article>
        </section>
        <section className="values-section"><span className="eyebrow dark">OUR CORE VALUES</span><h2>How we work, every step of the way.</h2><div className="values-grid"><article><b>01</b><h3>Integrity</h3><p>Honesty, confidentiality and clear communication.</p></article><article><b>02</b><h3>Client focus</h3><p>Listening carefully and tailoring support to each client.</p></article><article><b>03</b><h3>Quality</h3><p>Care, diligence and attention to detail in every assignment.</p></article><article><b>04</b><h3>Practical innovation</h3><p>Combining sound thinking, creativity and useful technology.</p></article></div></section>
        <a className="button button-secondary" href="/contact">Discuss your project ↗</a>
      </section>
      <div className="footer-service-strip" aria-label="Johden core service areas"><span>BUSINESS STRATEGY</span><i aria-hidden="true"/><span>BRAND &amp; MARKETING</span><i aria-hidden="true"/><span>SOFTWARE SOLUTIONS</span><i aria-hidden="true"/><span>RESEARCH &amp; INSIGHT</span></div>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span></div></footer>
    </main>
  );
}
