import Image from "next/image";

export default function Home() {
  return (
    <main className="home-page">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Johden home"><Image src="/johden-logo.svg" alt="Johden Business Consultancy Services" width={310} height={105} priority /></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="/" aria-current="page">Home</a>
          <a href="/services">Services</a>
          <a href="/about">About</a>
          <a href="/technology">Technology</a>
          <a href="/contact">Contact</a>
        </nav>
        <a className="button button-primary header-cta" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Let’s talk <span>↗</span></a>
      </header>

      <section className="hero home-hero">
        <div className="hero-content">
          <span className="eyebrow"><i /> YOUR PARTNER IN PROGRESS</span>
          <h1>Good ideas deserve <em>great execution.</em></h1>
          <p className="hero-lede">Practical academic and business solutions to help you move forward with clarity, confidence and the right support.</p>
          <div className="hero-actions"><a className="button button-primary" href="/services">Explore our services <span>↗</span></a><a className="button button-secondary" href="/contact">Make an inquiry</a></div>
          <div className="hero-assurance"><span className="assurance-icon">✓</span><p><strong>One partner. Multiple capabilities.</strong><br/>Consultancy, creativity and technology working together.</p></div>
        </div>
        <div className="hero-visual">
          <div className="hero-visual-shape">
            <div className="hero-photo-caption"><span>JOHDEN BUSINESS CONSULTANCY SERVICES</span><strong>Strategy. Growth.<br/>Technology.</strong></div>
          </div>
          <div className="hero-image-badge"><span className="hero-image-badge-icon">↗</span><div><small>BUILT AROUND YOU</small><strong>Practical solutions. Real progress.</strong></div></div>
        </div>
      </section>

      <section className="home-intro">
        <span className="eyebrow dark"><i/> A GOOD PLACE TO START</span>
        <h2>What are you looking to <em>achieve?</em></h2>
        <p>Explore our services to find the right support for your organisation, your research or your next big idea. We’ll help you turn your goals into practical next steps.</p>
        <div className="home-intro-actions"><a className="button button-primary" href="/services">View all services <span>↗</span></a><a className="text-link" href="/about">Get to know Johden <span>→</span></a></div>
      </section>

      <section className="johden-testimonials">
        <div className="johden-testimonials-heading"><span className="eyebrow dark"><i/> CLIENT FEEDBACK</span><h2>What clients appreciate about <em>Johden</em></h2><p>Feedback shared on our previous website highlights the value of practical guidance and personal support.</p></div>
        <div className="johden-testimonial-grid">
          <blockquote><span className="quote-mark">“</span><p>I can't thank JOHDEN CONSULTANCY SERVICES enough for their exceptional services. We needed funding for our expansion plans, and the team crafted a business plan and grant proposal that gave us a clear roadmap for growth. Their dedication, expertise and attention to detail were truly impressive.</p><footer>Business planning and grant proposal client</footer></blockquote>
          <blockquote><span className="quote-mark">“</span><p>JOHDEN CONSULTANCY SERVICES played a pivotal role in my academic journey. Their assistance with my research proposal and dissertation was invaluable. They helped refine my ideas and guided me through proposal writing and data analysis with patience and commitment to academic excellence.</p><footer>Research and dissertation support client</footer></blockquote>
        </div>
      </section>
      <section className="home-contact-band">
        <div><span className="eyebrow"><i/> READY WHEN YOU ARE</span><h2>Let’s talk about<br/><em>what comes next.</em></h2><p>Have a project in mind or need a little guidance? Start a conversation with our team.</p></div>
        <div className="home-contact-actions"><a className="button button-light" href="/contact">Make an inquiry <span>↗</span></a><a className="home-whatsapp" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer">Or chat with us on WhatsApp ↗</a></div>
      </section>

      <div className="footer-service-strip" aria-label="Johden core service areas"><span>BUSINESS STRATEGY</span><i aria-hidden="true"/><span>BRAND &amp; MARKETING</span><i aria-hidden="true"/><span>SOFTWARE SOLUTIONS</span><i aria-hidden="true"/><span>RESEARCH &amp; INSIGHT</span></div>
      <footer className="site-footer"><div className="footer-bottom"><span>© {new Date().getFullYear()} Johden Business Consultancy Services. All rights reserved.</span></div></footer>
      <a className="floating-contact" href="https://wa.me/256702846597" target="_blank" rel="noopener noreferrer" aria-label="Chat with Johden on WhatsApp"><span>↗</span><b>Talk to us</b></a>
    </main>
  );
}
