// ============================================
//  EQTestStepper.tsx
//
//  Shared card-based stepper for both EQ tests:
//    - Onboarding (20 questions) — rendered full-page at /onboarding
//    - Weekly reflection (10 questions) — rendered inside ReflectionPanel
//
//  One question per screen, with the EQ area name + a progress bar, the four
//  options as selectable cards, and warm Mongolian microcopy (never
//  "right/wrong"). The running score is intentionally hidden. The parent
//  supplies the question list and an onSubmit that posts {questionId,
//  selectedOption} pairs — the stepper never computes or shows scores.
// ============================================

"use client";

import { useMemo, useState } from "react";
import type { EQArea } from "@prisma/client";
import type { EQQuestion, EQOption } from "@/lib/eqQuestions";

// Deterministic shuffle (seeded by question id) so option order is stable
// across re-renders but NOT in ascending-score order — removes the "last
// option is always the 'best' answer" positional cue. Scoring is unaffected:
// each option keeps its label+score, and the server resolves the score from
// the selected label, not its position.
function shuffleBySeed(options: EQOption[], seed: string): EQOption[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  const arr = [...options];
  for (let i = arr.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 16777619);
    const j = (h >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const AREA_LABEL_MN: Record<EQArea, string> = {
  SELF_AWARENESS: "Өөрийгөө таних",
  SELF_REGULATION: "Сэтгэлээ тайвшруулах",
  MOTIVATION: "Дотоод хүсэл эрмэлзэл",
  EMPATHY: "Бусдыг ойлгох",
  SOCIAL_SKILLS: "Харилцааны ур чадвар",
};

export interface EQAnswer {
  questionId: string;
  selectedOption: string;
}

export function EQTestStepper({
  questions,
  onSubmit,
  submitLabel = "Дуусгах",
}: {
  questions: EQQuestion[];
  onSubmit: (answers: EQAnswer[]) => Promise<void>;
  submitLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const total = questions.length;
  const q = questions[index];
  const displayOptions = useMemo(() => shuffleBySeed(q.options, q.id), [q.id, q.options]);
  const selected = answers[q.id];
  const isLast = index === total - 1;
  const progress = Math.round(((index + 1) / total) * 100);

  function choose(label: string) {
    setAnswers((a) => ({ ...a, [q.id]: label }));
  }

  function next() {
    if (!selected) return;
    if (!isLast) setIndex((i) => i + 1);
  }

  async function submit() {
    if (Object.keys(answers).length < total) {
      setError("Бүх асуултад хариулна уу.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(
        questions.map((qq) => ({ questionId: qq.id, selectedOption: answers[qq.id] })),
      );
    } catch {
      setError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      setSubmitting(false);
    }
  }

  return (
    <div style={S.wrap}>
      {/* Progress */}
      <div style={S.progressRow}>
        <span style={S.section}>{AREA_LABEL_MN[q.eqArea]}</span>
        <span style={S.count}>
          {index + 1} / {total}
        </span>
      </div>
      <div style={S.barTrack} aria-hidden>
        <div style={{ ...S.barFill, width: `${progress}%` }} />
      </div>

      {/* Question */}
      <p style={S.question}>{q.question}</p>

      {/* Options */}
      <div style={S.options}>
        {displayOptions.map((opt) => {
          const on = selected === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => choose(opt.label)}
              style={{ ...S.option, ...(on ? S.optionOn : null) }}
            >
              <span style={{ ...S.optionDot, ...(on ? S.optionDotOn : null) }} aria-hidden />
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      <p style={S.micro}>
        Зөв буруу хариулт гэж байхгүй. Өөрт чинь хамгийн ойр санагдсан хариултаа сонго.
      </p>

      {error && <p style={S.error}>{error}</p>}

      {/* Nav */}
      <div style={S.nav}>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || submitting}
          style={{ ...S.navBtn, ...S.navBack, ...(index === 0 ? S.navDisabled : null) }}
        >
          Буцах
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={!selected || submitting}
            style={{ ...S.navBtn, ...S.navNext, ...(!selected || submitting ? S.navDisabled : null) }}
          >
            {submitting ? "Хадгалж байна…" : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={!selected}
            style={{ ...S.navBtn, ...S.navNext, ...(!selected ? S.navDisabled : null) }}
          >
            Дараах
          </button>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  wrap: { width: "100%", maxWidth: 560, margin: "0 auto" },
  progressRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  section: { fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#7a9e72" },
  count: { fontSize: 12, color: "#9a8f7d", fontWeight: 600 },
  barTrack: { height: 6, borderRadius: 6, background: "rgba(122,158,114,0.18)", overflow: "hidden", marginBottom: 22 },
  barFill: { height: "100%", borderRadius: 6, background: "#7a9e72", transition: "width 0.25s ease" },
  question: { fontSize: 18, fontWeight: 700, lineHeight: 1.45, color: "#3a3228", margin: "0 0 18px" },
  options: { display: "flex", flexDirection: "column", gap: 10 },
  option: {
    display: "flex", alignItems: "center", gap: 12, textAlign: "left",
    padding: "14px 16px", borderRadius: 14, border: "1.5px solid rgba(122,158,114,0.25)",
    background: "rgba(252,248,240,0.9)", color: "#3a3228", fontSize: 14.5, lineHeight: 1.4,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
  },
  optionOn: { border: "1.5px solid #7a9e72", background: "rgba(122,158,114,0.14)", boxShadow: "0 4px 14px rgba(122,158,114,0.22)" },
  optionDot: { flexShrink: 0, width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(122,158,114,0.45)", background: "transparent" },
  optionDotOn: { border: "5px solid #7a9e72", background: "#fff" },
  micro: { fontSize: 12.5, color: "#9a8f7d", fontStyle: "italic", margin: "16px 0 0", textAlign: "center" },
  error: { fontSize: 13, color: "#c2654f", textAlign: "center", margin: "10px 0 0" },
  nav: { display: "flex", gap: 12, marginTop: 20 },
  navBtn: { flex: 1, padding: "12px 0", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.03em", border: "none", transition: "all 0.15s" },
  navBack: { background: "rgba(122,158,114,0.12)", color: "#5a6e54" },
  navNext: { background: "#7a9e72", color: "#fff", boxShadow: "0 4px 14px rgba(122,158,114,0.35)" },
  navDisabled: { opacity: 0.45, cursor: "not-allowed", boxShadow: "none" },
};
