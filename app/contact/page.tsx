import type { Metadata } from "next";
import Image from "next/image";
import InquiryForm from "./InquiryForm";

export const metadata: Metadata = { title: "Contact Johden", description: "Send a service inquiry or request a consultation with Johden Business Consultancy Services." };

export default function Page() {
  return <main className="inner-page">
    <header className="site-header"><a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={290} height={98} priority/></a><nav className="desktop-nav" aria-label="Main navigation">
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <a href="/about">About</a>
          <a href="/technology">Technology</a>
          <a href="/contact" aria-current="page">Contact</a>
        </nav><a className="button button-primary header-cta" href="#contact-form">Let’s talk <span>↗</span></a></header>
    <section className="inner-hero"><span className="eyebrow dark"><i/> START A CONVERSATION</span><h1>Let’s make your next step <em>clear.</em></h1><p>Tell us what you’re working on, or request a consultation. We’ll help you explore the right next step.</p><div className="contact-benefits"><span>✓ Personalised guidance</span><span>✓ Clear next steps</span><span>✓ No-obligation inquiry</span></div><div className="inner-hero-visual contact-hero-visual" role="img" aria-label="Business professionals having a welcoming consultation" style={{backgroundImage:"linear-gradient(180deg,rgba(38,35,38,.02) 20%,rgba(38,35,38,.76) 100%),url(https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=90)"}}><div className="inner-hero-visual-caption"><span>LET’S START A CONVERSATION</span><strong>The right next step starts here.</strong></div></div></section>
    <section className="contact-layout" id="contact-form"><div className="contact-side"><span className="eyebrow dark"><i/> HOW WE CAN HELP</span><h2>Start with a conversation.</h2><p>Share as much or as little as you know. You do not need to have every detail figured out before reaching out.</p><div className="contact-promise"><span>01</span><div><strong>Tell us about your needs</strong><p>Choose a service and give us a little context.</p></div></div><div className="contact-promise"><span>02</span><div><strong>We’ll discuss the options</strong><p>We can clarify scope, priorities and potential next steps.</p></div></div><div className="contact-promise"><span>03</span><div><strong>Agree on the way forward</strong><p>Move ahead only when the approach is clear.</p></div></div><div className="contact-help"><strong>Prefer WhatsApp?</strong><p>The form prepares a message and opens WhatsApp, where you can select Johden’s official business chat before sending.</p></div></div><InquiryForm/></section>
    <div className="footer-service-strip" aria-label="Johden core service areas"><span>BUSINESS STRATEGY</span><i aria-hidden="true"/><span>BRAND &amp; MARKETING</span><i aria-hidden="true"/><span>SOFTWARE SOLUTIONS</span><i aria-hidden="true"/><span>RESEARCH &amp; INSIGHT</span></div>
    <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span></div></footer>
  </main>;
}