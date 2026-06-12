// ============================================
//  OnboardingFlow.tsx
//
//  Client wrapper for the one-time onboarding EQ reflection (the /onboarding
//  page is a thin server gate that renders this). Posts answers to
//  /api/eq/onboarding and, on success, sends the user into their garden.
// ============================================

"use client";

import { ONBOARDING_QUESTIONS } from "@/lib/eqQuestions";
import { EQTestStepper, type EQAnswer } from "@/components/eq/EQTestStepper";

export function OnboardingFlow() {
  async function submit(answers: EQAnswer[]) {
    const res = await fetch("/api/eq/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error("Failed to save onboarding result");
    window.location.href = "/garden";
  }

  return (
    <div style={page}>
      <div style={card}>
        <header style={head}>
          <span style={eyebrow}>Тавтай морил</span>
          <h1 style={title}>Эхлэхийн өмнө бяцхан эргэцүүлэл</h1>
          <p style={sub}>
            Энэ бол шалгалт биш — зүгээр л чамайг өнөөдөр хаана байгааг
            ойлгоход туслах хэдэн асуулт. Зөв буруу хариулт байхгүй. Хэдхэн
            минут л болно.
          </p>
        </header>

        <EQTestStepper
          questions={ONBOARDING_QUESTIONS}
          onSubmit={submit}
          submitLabel="Дуусгаад цэцэрлэгтээ орох"
        />
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 18px",
  background:
    "linear-gradient(rgba(35,39,27,0.55), rgba(35,39,27,0.7)), url('/garden/garden-bg.png') center/cover fixed",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 620,
  background: "rgba(252,248,240,0.97)",
  borderRadius: 24,
  padding: "32px 28px 28px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
};

const head: React.CSSProperties = { textAlign: "center", marginBottom: 26 };
const eyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#7a9e72",
};
const title: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  color: "#3a3228",
  margin: "8px 0 10px",
  lineHeight: 1.3,
};
const sub: React.CSSProperties = {
  fontSize: 14.5,
  color: "#7a6e60",
  lineHeight: 1.6,
  margin: 0,
};
