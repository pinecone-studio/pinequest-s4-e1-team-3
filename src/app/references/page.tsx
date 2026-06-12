// ============================================
//  /references
//
//  A standalone page listing the research behind the claims on the landing
//  page. Footnote markers there (e.g. /references#ref-2) link straight to a
//  numbered entry here.
// ============================================

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Эх сурвалж · Bordoo",
  description: "Bordoo-н баталгаажуулсан судалгаанууд.",
};

const REFERENCES: {
  author: string;
  title: string;
  source: string;
  url: string;
  note: string;
}[] = [
  {
    author: "Hodzic S., Scharfen J., Ripoll P., Holling H., Zenasni F. (2018).",
    title: "“How Efficient Are Emotional Intelligence Trainings: A Meta-Analysis.”",
    source: "Emotion Review, 10(2), 138–148.",
    url: "https://journals.sagepub.com/doi/abs/10.1177/1754073917708613",
    note: "Зохион байгуулалттай дадлага сэтгэл хөдлөлийн оюун ухааныг бодитоор нэмэгдүүлдгийг харуулсан мета-шинжилгээ.",
  },
  {
    author: "Lieberman M.D., Eisenberger N.I., Crockett M.J. нар (2007).",
    title:
      "“Putting Feelings Into Words: Affect Labeling Disrupts Amygdala Activity in Response to Affective Stimuli.”",
    source: "Psychological Science, 18(5), 421–428.",
    url: "https://journals.sagepub.com/doi/10.1111/j.1467-9280.2007.01916.x",
    note: "Мэдрэмжээ үгээр нэрлэх нь тархины айдсын төв (амигдала)-ийн хариу урвалыг намжаадгийг тогтоосон.",
  },
  {
    author: "Baikie K.A., Wilhelm K. (2005).",
    title: "“Emotional and physical health benefits of expressive writing.”",
    source: "Advances in Psychiatric Treatment, 11(5), 338–346.",
    url: "https://sparq.stanford.edu/sites/g/files/sbiybj19021/files/media/file/baikie_wilhelm_2005_-_emotional_and_physical_health_benefits_of_expressive_writing.pdf",
    note: "Сэтгэл хөдлөлөө бичих нь сэтгэл санаа, бие махбодын эрүүл мэндэд тустайг нэгтгэн дүгнэсэн.",
  },
  {
    author: "Fitzpatrick K.K., Darcy A., Vierhile M. (2017).",
    title:
      "“Delivering Cognitive Behavior Therapy to Young Adults … Using a Fully Automated Conversational Agent (Woebot): A Randomized Controlled Trial.”",
    source: "JMIR Mental Health, 4(2):e19.",
    url: "https://mental.jmir.org/2017/2/e19/",
    note: "Яриа хөтлөгч (chatbot) сэтгэлийн шинжийг хөнгөвчилж чаддаг ч мэргэжлийн эмчилгээг орлодоггүйг харуулсан хяналттай туршилт.",
  },
];

const ink = "#3a3228";
const inkSoft = "#7a6e60";
const leaf = "#6f8a5b";

export default function ReferencesPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(120% 120% at 50% 0%, #f7f1e4 0%, #efe7d6 60%, #e7ddc8 100%)",
        padding: "64px 22px 96px",
        fontFamily: "'Mulish', system-ui, sans-serif",
        color: ink,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: 32,
            fontSize: 13,
            fontWeight: 700,
            color: leaf,
            textDecoration: "none",
            letterSpacing: "0.02em",
          }}
        >
          ← Нүүр хуудас
        </Link>

        <p
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: inkSoft,
            margin: "0 0 8px",
          }}
        >
          Эх сурвалж
        </p>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.15,
            margin: "0 0 12px",
          }}
        >
          Судалгаанд тулгуурласан
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.65, color: inkSoft, margin: "0 0 40px", maxWidth: 580 }}>
          Bordoo-н арга барил дараах хянан магадалсан судалгаануудад тулгуурладаг.
        </p>

        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            counterReset: "ref",
          }}
        >
          {REFERENCES.map((r, i) => (
            <li
              key={i}
              id={`ref-${i + 1}`}
              style={{
                position: "relative",
                padding: "22px 0 22px 48px",
                borderTop: "1px solid rgba(60,50,40,0.14)",
                scrollMarginTop: 90,
              }}
            >
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 22,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(111,138,91,0.14)",
                  color: leaf,
                  fontWeight: 800,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {i + 1}
              </span>
              <p style={{ margin: "0 0 6px", fontSize: 15, lineHeight: 1.55, fontWeight: 600 }}>
                {r.author}{" "}
                <span style={{ fontWeight: 400 }}>{r.title}</span>{" "}
                <i style={{ color: inkSoft }}>{r.source}</i>
              </p>
              <p style={{ margin: "0 0 8px", fontSize: 13.5, lineHeight: 1.6, color: inkSoft }}>
                {r.note}
              </p>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: leaf,
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Эх сурвалж нээх ↗
              </a>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
