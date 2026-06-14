"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getWeeklySet, ONBOARDING_QUESTIONS } from "@/lib/eqQuestions";
import { EQTestStepper } from "@/components/eq/EQTestStepper";
import type { EQAnswer } from "@/components/eq/EQTestStepper";
import { useTutorial } from "@/components/tutorial/TutorialContext";
import { TUTORIAL_STEPS } from "@/components/tutorial/steps";

type WeeklyStatus = {
  available: boolean;
  setIndex: number;
};

export function WeeklyCheckInBird({
  needsOnboarding = false,
}: {
  /** True when the user hasn't taken the 20-question onboarding test yet.
   *  During the tour the bird then opens the onboarding test (not the weekly
   *  one), and completing it advances the tour. */
  needsOnboarding?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [setIndex, setSetIndex] = useState(0);
  // `needsOnboarding` is a server prop captured at page load; once the user
  // finishes the onboarding test in this session it's stale. Track completion
  // locally so replaying the tour doesn't re-offer the 20-question test.
  const [stillNeedsOnboarding, setStillNeedsOnboarding] =
    useState(needsOnboarding);

  // The bird's tour step. We force-show the bird here so it can be spotlit like
  // the greenhouse. For a brand-new user (needsOnboarding) clicking it opens
  // the one-time 20-question onboarding test; finishing that advances the tour.
  const { tutorialActive, currentStep, advanceStep, setOverlaySuppressed } =
    useTutorial();
  const tutorialPreview =
    tutorialActive && TUTORIAL_STEPS[currentStep]?.target === "weekly-checkin";
  const onboardingMode = tutorialPreview && stillNeedsOnboarding;

  // While the bird's test modal is open during the tour, hide the tutorial
  // overlay so its dimmer/tooltip don't render on top of the dialog.
  useEffect(() => {
    setOverlaySuppressed(open && tutorialPreview);
  }, [open, tutorialPreview, setOverlaySuppressed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/eq/weekly")
      .then((r) => r.json())
      .then((data: WeeklyStatus) => {
        if (cancelled || !data.available) return;
        setSetIndex(data.setIndex ?? 0);
        setTimeout(() => setVisible(true), 1200);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(answers: EQAnswer[]) {
    await fetch("/api/eq/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setSubmitted(true);
    setTimeout(() => {
      setOpen(false);
      setVisible(false);
    }, 2000);
  }

  // Onboarding test (taken once, via the bird, during the guided tour). On
  // success we close the dialog and advance the tour to the next step.
  async function handleOnboardingSubmit(answers: EQAnswer[]) {
    await fetch("/api/eq/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    // Onboarding is now done for this session — don't re-offer it on replay.
    setStillNeedsOnboarding(false);
    setOpen(false);
    advanceStep();
  }

  function dismiss() {
    setOpen(false);
  }

  if (!visible && !tutorialPreview) return null;

  return (
    <>
      {/* Notification card below the Clerk avatar button (top-right) */}
      <button
        type="button"
        aria-label="7 хоногийн тестээ өгөөрэй"
        data-tutorial-target="weekly-checkin"
        onClick={() => {
          // New user on the tour → open the 20-question onboarding test.
          if (onboardingMode) {
            setOpen(true);
            return;
          }
          // Already-onboarded user replaying the tour: nothing to fill here, so
          // clicking the (example) bird just advances to the next step.
          if (tutorialPreview) {
            advanceStep();
            return;
          }
          setOpen(true);
        }}
        style={{
          position: "fixed",
          top: 96,
          right: 28,
          zIndex: 50,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          animation: "checkin-fade-in 0.4s ease",
        }}
      >
        {/* Bird — text card anchored to its beak */}
        <span
          style={{
            position: "relative",
            display: "block",
            width: 80,
            height: 80,
          }}
        >
          <Image
            src="/garden/bird.png"
            alt=""
            width={80}
            height={80}
            unoptimized
            style={{
              display: "block",
              objectFit: "contain",
              transform: "scaleX(-1)",
            }}
          />

          {/* Text card — anchored to beak (left side, ~36px from top) */}
          <span
            style={{
              position: "absolute",
              right: 86,
              top: 10,
              background: "rgba(253,248,234,0.96)",
              border: "1.5px solid rgba(160,130,60,0.35)",
              borderRadius: 14,
              boxShadow: "0 6px 24px rgba(40,28,6,0.2)",
              padding: "8px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              textAlign: "right",
              backdropFilter: "blur(6px)",
              whiteSpace: "nowrap",
            }}
          >
            {/* right-pointing triangle toward beak */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                right: -7,
                top: "50%",
                transform: "translateY(-50%)",
                width: 0,
                height: 0,
                borderTop: "6px solid transparent",
                borderBottom: "6px solid transparent",
                borderLeft: "7px solid rgba(253,248,234,0.96)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#3a2a08",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.3,
              }}
            >
              7 хоногийн тест
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#8a6a28",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.35,
              }}
            >
              Дарж тест өгөөрэй 🌿
            </span>
          </span>

          {/* Pulse dot */}
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#e8a84a",
              border: "2px solid #fff",
              animation: "checkin-pulse 1.6s ease-out infinite",
            }}
          />
        </span>
      </button>

      {/* Dialog */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(22,19,11,0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflowY: "auto",
            padding: "24px 0",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <div
            style={{
              background: "rgba(253,248,238,0.97)",
              borderRadius: 24,
              padding: "36px 40px",
              width: "min(580px, 92vw)",
              boxShadow: "0 40px 100px rgba(20,16,8,0.42)",
              animation: "garden-panel-pop 0.2s ease",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={dismiss}
              style={{
                position: "absolute",
                top: 16,
                right: 18,
                background: "none",
                border: "none",
                fontSize: 20,
                color: "#8a7a5a",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              ×
            </button>

            {submitted ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🌿</div>
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 21,
                    color: "#2c2516",
                  }}
                >
                  Баярлалаа. Долоо хоногийн дараа уулзацгаая.
                </p>
              </div>
            ) : (
              <>
                <h2
                  style={{
                    fontFamily: "'Cormorant Garamond', Georgia, serif",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "#2c2516",
                    marginBottom: 6,
                  }}
                >
                  {onboardingMode ? "Эхлэхийн өмнө бяцхан эргэцүүлэл" : "7 хоногийн тест"}
                </h2>
                <p style={{ fontSize: 13, color: "#8a7a5a", marginBottom: 28 }}>
                  {onboardingMode
                    ? "Энэ бол шалгалт биш — өнөөдөр хаана байгаагаа ойлгоход туслах хэдэн асуулт."
                    : "Долоо хоног тутам нэг удаа."}
                </p>
                <EQTestStepper
                  questions={
                    onboardingMode ? ONBOARDING_QUESTIONS : getWeeklySet(setIndex)
                  }
                  onSubmit={onboardingMode ? handleOnboardingSubmit : handleSubmit}
                  submitLabel="Дуусгах"
                />
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
