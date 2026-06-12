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
        <a className="nav-link hide-sm" href="#how" onClick={go("how")}>Хэрхэн ургадаг</a>
        <a className="nav-link hide-sm" href="#faq" onClick={go("faq")}>Асуултууд</a>
        <div className="nav-actions">
          <a className="nav-link" href="#login" onClick={(e) => { e.preventDefault(); onLogin(); }}>Нэвтрэх</a>
          <button className="btn" onClick={onBegin}>Эхлэх</button>
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

  const rawTitle = "Сэтгэлээ ойлгож *хөгжүүл*.";
  const titleHtml = rawTitle
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");

  return (
    <header className="hero" id="top" data-layout="left">
      <div className="hero-art" ref={artRef}>
        <img src="/garden/garden-bg.png" alt="Нартай, агуу том мод, нам гүм нууртай үлгэрийн цэцэрлэг" />
      </div>
      <div className="hero-grade" />
      <div className="hero-vignette" />
      <Rays level="alive" />
      <Petals level="alive" />

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="eyebrow on-art">EQ хөгжүүлэх цэцэрлэг</p>
          <h1 className="display" dangerouslySetInnerHTML={{ __html: titleHtml }} />
          <p className="hero-sub">
            Bordoo бол сэтгэл хөдлөлийн таван чадвараа яриа, өдөр тутмын дадлагаар хөгжүүлдэг EQ-н цэцэрлэг.
          </p>
          <div className="hero-cta">
            <button className="btn lg" onClick={onBegin}>Цэцэрлэгээ эхлүүл</button>
            <a
              className="btn lg ghost"
              href="#how"
              onClick={(e) => { e.preventDefault(); cue(); }}
            >
              Хэрхэн хөгждөгийг үзэх
            </a>
          </div>
          <p className="hero-note">
            <b>Эхлэхэд үнэгүй.</b>&nbsp; Нууцлал хамгаалагдсан · Голманы 5 чадварт суурилсан
          </p>
        </div>
      </div>

      <div className="scroll-cue" onClick={cue} style={{ cursor: "pointer" }}>
        <span>Дотогш алхах</span>
        <span className="dot" />
      </div>
    </header>
  );
}

function Assurance() {
  const items = [
    "Голманы таван EQ чадвар",
    "Өдөр бүр бяцхан дадлага",
    "Нууцлалтай",
    "Чадвар чинь хэмжигдэж өсдөг",
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
    { n: "I", t: "Чадвараа сонго", d: "Хөгжүүлэхийг хүссэн EQ чадвараа төлөөлөх цэцгийг сонгож тарь. Цэцэг бүр Голманы таван чадварын нэгд зориулагдсан — өөрийгөө таних, зохицуулах, урам зориг, бусдыг ойлгох, харилцах." },
    { n: "II", t: "Ярилцаж дадлагал", d: "Дэмжигчтэйгээ ярилцаж, өнөөдрийн нөхцөл байдал, мэдрэмжээ үгээр нэрлэж, бодит жишээн дээр дадлага хий. Сургаал биш — чиний хэмнэлээр." },
    { n: "III", t: "Ахицаа хар", d: "Долоо хоног тутмын эргэцүүллээр чадвар бүрийн ахицаа хар. Цэцэрлэг өсөхийн хэрээр чиний сэтгэл хөдлөлийн оюун ухаан ч өсдөг." },
  ];
  return (
    <section className="scene" id="how">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Хэрхэн хөгждөг</span>
          <h2>EQ бол төрөлхийн бэлэг биш.<br />Дадлагаар хөгждөг чадвар.</h2>
          <p>Bordoo чамайг нэг шөнийн дотор өөрчлөхгүй. Энэ бол өдөр бүр бяцхан дадлагаар сэтгэл хөдлөлийн чадвараа тууштай хөгжүүлэх газар.</p>
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

// Small superscript footnote marker linking to the dedicated references page.
function Ref({ n }: { n: number }) {
  return (
    <sup style={{ fontSize: "0.66em", lineHeight: 0 }}>
      <a
        href={`/references#ref-${n}`}
        style={{
          color: "var(--leaf, #6f8a5b)",
          textDecoration: "none",
          fontWeight: 800,
          padding: "0 1px",
        }}
      >
        {n}
      </a>
    </sup>
  );
}

function FAQ({ onBegin }: { onBegin: () => void }) {
  return (
    <section className="scene" id="faq" style={{ background: "var(--parchment-2)" }}>
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Эхлэхээсээ өмнө</span>
          <h2>Шударга асуултад тодорхой хариулт</h2>
        </div>
        <div className="faq">
          <aside className="faq-aside">
            <div className="quietcard">
              <h3>Эргэлзсээр байна уу?</h3>
              <p>Эхлэх буруу арга гэж байхгүй. Эргэн тойрноо харж, нэг чадвар сонгож, дуртай үедээ гарч болно. Юу ч төлбөргүй.</p>
              <button className="btn full" onClick={onBegin}>Эхний үрээ тарь</button>
            </div>
          </aside>
          <div className="faq-list">
            <FAQItem q="Сэтгэл хөдлөлийн оюун ухаан (EQ) гэж юу вэ?">
              <p>EQ бол өөрийн болон бусдын сэтгэл хөдлөлийг таньж, ойлгож, удирдах чадвар. Дэниел Голман үүнийг таван хэсэгт хуваадаг: өөрийгөө таних, өөрийгөө зохицуулах, урам зориг, бусдыг ойлгох, бусадтай харилцах. Bordoo-н цэцэг бүр эдгээрийн нэгийг төлөөлдөг.</p>
            </FAQItem>
            <FAQItem q="EQ үнэхээр хөгждөг үү?">
              <p>Тийм. IQ-гаас ялгаатай нь EQ бол дадлагаар сайжруулж болох чадвар. Хяналттай судалгаануудын мета-шинжилгээгээр зохион байгуулалттай дадлага сэтгэл хөдлөлийн оюун ухааныг бодитоор нэмэгдүүлдэг нь батлагдсан.<Ref n={1} /></p>
            </FAQItem>
            <FAQItem q="Bordoo яаж ажилладаг вэ?">
              <p>Хөгжүүлэхийг хүссэн чадвараа сонгож цэцэг тарина. Дараа нь дэмжигчтэйгээ ярилцаж, мэдрэмжээ үгээр нэрлэж дадлага хийнэ — мэдрэмжээ нэрлэх нь өөрийгөө танихыг сайжруулж, тархины айдсын хариу урвалыг намжаадаг.<Ref n={2} /> Чухал бодлоо тэмдэглэлд бичиж болох ба,<Ref n={3} /> долоо хоног тутам ахицаа хэмжинэ.</p>
            </FAQItem>
            <FAQItem q="Энэ эмчилгээ (терапи) мөн үү?">
              <p>Үгүй. Bordoo бол чадвар хөгжүүлэх дадлагын хэрэгсэл — мэргэжлийн эмчилгээг орлохгүй. Хяналттай туршилтаар ийм яриа хөтлөгчид сэтгэлийн шинжийг хөнгөвчилдөг ч эмчилгээний оронд биш, түүнийг дэмжих зорилготой.<Ref n={4} /> Хэрэв та хүндээр зовж байвал мэргэжлийн хүнд хандаарай.</p>
            </FAQItem>
            <FAQItem q="Миний хуваалцсан зүйл нууц уу?">
              <p>Таны яриа танд харьяалагдана. Тэдгээр нь шифрлэгдсэн, хэзээ ч зарагдахгүй бөгөөд та ямар ч үед бүгдийг унших, татах эсвэл устгаж болно — асуулт ч, бэрхшээл ч үгүй.</p>
            </FAQItem>
            <FAQItem q="Үнэ нь хэд вэ?">
              <p>Bordoo эхлэхэд үнэгүй, өдөр тутмын дадлагад үргэлжлүүлэн ашиглахад ч үнэгүй. Төлбөртэй багц нь гүн дурсамж, удирдсан аяллыг нэмдэг.</p>
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
            <p>Сэтгэл хөдлөлийн оюун ухаанаа өдөр бүр бяцхан дадлагаар хөгжүүлэх цэцэрлэг.</p>
          </div>
          <div className="footer-col">
            <h4>Цэцэрлэг</h4>
            <a href="#how" onClick={scrollTo("how")}>Хэрхэн хөгждөг</a>
            <a href="#faq" onClick={scrollTo("faq")}>Асуултууд</a>
            <a href="#begin" onClick={(e) => { e.preventDefault(); onBegin(); }}>Үнэгүй эхлэх</a>
            <a href="#login" onClick={(e) => { e.preventDefault(); onLogin(); }}>Нэвтрэх</a>
          </div>
          <div className="footer-col">
            <h4>Нөөц</h4>
            <a href="/references">Эх сурвалж</a>
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Нууцлалын амлалт</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Үйлчилгээний нөхцөл</a>
          </div>
          <div className="footer-col">
            <h4>Bordoo</h4>
            <a href="#about" onClick={(e) => e.preventDefault()}>Бидний түүх</a>
            <a href="#contact" onClick={(e) => e.preventDefault()}>Холбоо барих</a>
            <a href="/references">Судалгаа</a>
          </div>
        </div>

        <div className="crisis">
          <span className="gem" />
          <span>
            Bordoo бол сэтгэл хөдлөлийн чадвараа дадлагажуулах хэрэгсэл — мэргэжлийн сэтгэцийн эрүүл мэндийн тусламжийг орлохгүй.
            Хэрэв та хүндээр зовж, аюулд байгаа бол мэргэжлийн хүн эсвэл ойрын хүндээ нэн даруй хандаарай.
          </span>
        </div>

        <div className="footer-base">
          <span>© 2026 Bordoo. Энхрийлэн бүтээв.</span>
          <span className="dots">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Нууцлал</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Үйлчилгээний нөхцөл</a>
            <a href="#accessibility" onClick={(e) => e.preventDefault()}>Хүртээмж</a>
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
