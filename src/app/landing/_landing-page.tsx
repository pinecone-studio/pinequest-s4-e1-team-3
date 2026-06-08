"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LeafMark, Rays, Petals, useParallax } from "./_atmosphere";
import "./bloom.css";
import "./bloom-scenes.css";

function Nav({ onLogin, onBegin }: { onLogin: () => void; onBegin: () => void }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
  };

  return (
    <nav className={`nav${solid ? " solid" : ""}`}>
      <a href="#top" onClick={go("top")} style={{ textDecoration: "none" }}>
        <LeafMark />
      </a>
      <div className="nav-links">
        <a className="nav-link hide-sm" href="#how" onClick={go("how")}>How it grows</a>
        <a className="nav-link hide-sm" href="#faq" onClick={go("faq")}>Questions</a>
        <div className="nav-actions">
          <a className="nav-link" href="#login" onClick={(e) => { e.preventDefault(); onLogin(); }}>Log in</a>
          <button className="btn" onClick={onBegin}>Begin</button>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onBegin }: { onBegin: () => void }) {
  const artRef = useParallax(true);
  const cue = () => {
    const el = document.getElementById("assure");
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: "smooth" });
  };

  const rawTitle = "Tend to the garden *within.*";
  const titleHtml = rawTitle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");

  return (
    <header className="hero" id="top" data-layout="left">
      <div className="hero-art" ref={artRef}>
        <img src="/garden/garden-bg.png" alt="A sunlit storybook garden with a great tree and a still pond" />
      </div>
      <div className="hero-grade" />
      <div className="hero-vignette" />
      <Rays level="alive" />
      <Petals level="alive" />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow on-art">A gentle companion for the mind</p>
          <h1 className="display" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <p className="hero-sub">
            Bloom is a gentle companion for the mind — a quiet place to talk, reflect and grow, whenever the world feels like too much.
          </p>
          <div className="hero-cta">
            <button className="btn lg" onClick={onBegin}>Begin your garden</button>
            <a
              className="btn lg ghost"
              href="#how"
              onClick={(e) => { e.preventDefault(); cue(); }}
            >
              See how it grows
            </a>
          </div>
          <p className="hero-note">
            <b>Free to begin.</b>&nbsp; Private by design · No judgment, ever
          </p>
        </div>
      </div>

      <div className="scroll-cue" onClick={cue} style={{ cursor: "pointer" }}>
        <span>Wander in</span>
        <span className="dot" />
      </div>
    </header>
  );
}

function Assurance() {
  const items = [
    "Here any hour, day or night",
    "Private & encrypted",
    "Not a clinic — a companion",
    "Grows with you",
  ];
  return (
    <section className="assure" id="assure">
      <div className="assure-row">
        {items.map((s, i) => (
          <span className="assure-item" key={i}>
            <span className="gem" />
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}

function Grows() {
  const steps = [
    { n: "I", t: "Arrive as you are", d: "No forms to perform. Tell Bloom how today actually feels — tangled, tired, hopeful, numb. It listens the way a good friend would." },
    { n: "II", t: "Tend what’s tender", d: "Bloom learns your weather over time and offers gentle prompts, grounding moments and reflections — never lectures, never a fixed script." },
    { n: "III", t: "Watch it bloom", d: "Return whenever you need to. Little by little, the patterns soften and the garden you are quietly fills back in." },
  ];
  return (
    <section className="scene" id="how">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">How it grows</span>
          <h2>Healing isn&apos;t a sprint.<br />It&apos;s a season.</h2>
          <p>Bloom isn&apos;t here to fix you in one sitting. It&apos;s a quiet place you can keep returning to, that remembers where you left off.</p>
        </div>
        <div className="grows-grid">
          {steps.map((s, i) => (
            <article className="grow-card" key={i}>
              <span className="grow-num display">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="scene-soil" />
    </section>
  );
}

function FAQItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const inner = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => {
    setH(open && inner.current ? inner.current.scrollHeight : 0);
  }, [open]);
  return (
    <div className={`faq-item${open ? " open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-sign" />
      </button>
      <div className="faq-a" style={{ height: h }}>
        <div className="faq-a-inner" ref={inner}>{children}</div>
      </div>
    </div>
  );
}

function FAQ({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="scene" id="faq" style={{ background: "var(--parchment-2)" }}>
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Before you wander in</span>
          <h2>Gentle answers to fair questions</h2>
        </div>
        <div className="faq">
          <aside className="faq-aside">
            <div className="quietcard">
              <h3>Still wondering?</h3>
              <p>There&apos;s no wrong way to begin. You can look around, talk a little, and leave whenever you like. Nothing is owed.</p>
              <button className="btn full" onClick={onBegin}>Plant your first seed</button>
            </div>
          </aside>
          <div className="faq-list">
            <FAQItem q="Is Bloom a replacement for therapy?">
              <p>No — and it won&apos;t pretend to be. Bloom is a companion for everyday reflection, grounding and support between (or alongside) professional care.</p>
              <p>If you&apos;re in crisis or in danger, Bloom will always point you toward real, human help straight away.</p>
            </FAQItem>
            <FAQItem q="Is what I share really private?">
              <p>Your conversations belong to you. They&apos;re encrypted, never sold, and you can read, export or delete everything at any time — no questions, no friction.</p>
            </FAQItem>
            <FAQItem q="What can I actually talk to Bloom about?">
              <p>Anything that&apos;s sitting on your chest — a hard day, a spiralling thought, grief, a small win you&apos;ve no one to tell. Bloom listens without judgment and meets you at your pace.</p>
            </FAQItem>
            <FAQItem q="What if I don't know what to say?">
              <p>That&apos;s the most common way to arrive. Bloom can open with a soft prompt, a grounding breath, or simply sit with you until words come. Silence is allowed here.</p>
            </FAQItem>
            <FAQItem q="How much does it cost?">
              <p>Bloom is free to begin and free to keep using for daily reflection. A gentle paid tier adds deeper memory and guided journeys — but care is never paywalled in a hard moment.</p>
            </FAQItem>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onBegin, onLogin }: { onBegin: () => void; onLogin: () => void }) {
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <LeafMark />
            <p>A quiet garden for the mind — somewhere to talk, reflect and grow, whenever you need it.</p>
          </div>
          <div className="footer-col">
            <h4>The Garden</h4>
            <a href="#how" onClick={scrollTo("how")}>How it grows</a>
            <a href="#faq" onClick={scrollTo("faq")}>Questions</a>
            <a href="#begin" onClick={(e) => { e.preventDefault(); onBegin(); }}>Begin free</a>
            <a href="#login" onClick={(e) => { e.preventDefault(); onLogin(); }}>Log in</a>
          </div>
          <div className="footer-col">
            <h4>Care</h4>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy promise</a>
            <a href="#safety" onClick={(e) => e.preventDefault()}>How we keep you safe</a>
            <a href="#crisis" onClick={(e) => e.preventDefault()}>Crisis resources</a>
          </div>
          <div className="footer-col">
            <h4>Bloom</h4>
            <a href="#about" onClick={(e) => e.preventDefault()}>Our story</a>
            <a href="#contact" onClick={(e) => e.preventDefault()}>Contact</a>
            <a href="#research" onClick={(e) => e.preventDefault()}>Research &amp; ethics</a>
          </div>
        </div>

        <div className="crisis">
          <span className="gem" />
          <span>
            Bloom isn&apos;t an emergency service. If you&apos;re in crisis or thinking about harming yourself, please reach out now —
            call or text your local crisis line, or dial{" "}
            <a href="tel:988" onClick={(e) => e.preventDefault()}>988</a> (US) /{" "}
            <a href="#crisis" onClick={(e) => e.preventDefault()}>your local line</a>.
            You deserve real, human help.
          </span>
        </div>

        <div className="footer-base">
          <span>© 2026 Bloom. Made gently.</span>
          <span className="dots">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms</a>
            <a href="#accessibility" onClick={(e) => e.preventDefault()}>Accessibility</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const onBegin = () => router.push("/sign-up");
  const onLogin = () => router.push("/sign-in");

  return (
    <div className="bloom-page">
      <div className="landing">
        <Nav onLogin={onLogin} onBegin={onBegin} />
        <Hero onBegin={onBegin} />
        <Assurance />
        <Grows />
        <FAQ onBegin={onBegin} />
        <Footer onBegin={onBegin} onLogin={onLogin} />
      </div>
    </div>
  );
}
