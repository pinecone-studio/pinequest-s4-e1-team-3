"use client";

import { useEffect } from "react";
import { useTutorial } from "./TutorialContext";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { TutorialTooltip } from "./TutorialTooltip";
import { TUTORIAL_STEPS } from "./steps";

interface TutorialOverlayProps {
  /** The currently active garden panel (from GardenShell state). */
  panel: string;
}

/**
 * Decides which tutorial step is visible given the current panel, then renders:
 *   - TutorialSpotlight  — the 4-panel dim overlay with a cutout over the target
 *   - TutorialTooltip    — the anchored floating hint card
 *   - Skip button        — low-weight "Skip tutorial" link in the bottom-right corner
 *   - Celebration overlay — full-screen fade for step 6
 */
export function TutorialOverlay({ panel }: TutorialOverlayProps) {
  const { tutorialActive, currentStep, advanceStep, skipTutorial, completeTutorial } =
    useTutorial();

  const stepDef = TUTORIAL_STEPS[currentStep];

  // ----- step 6: celebration -----
  // Render independently of tutorialActive flag so the fade has a moment to play
  // before completeTutorial() switches tutorialActive off.
  if (tutorialActive && currentStep === 6) {
    return (
      <CelebrationOverlay onDismiss={completeTutorial} timerMs={stepDef?.timerMs ?? 2500} />
    );
  }

  if (!tutorialActive || !stepDef) return null;

  // Which steps are visible in which panel states.
  const visible = (() => {
    switch (currentStep) {
      case 0:
      case 1:
        return panel === "garden";
      case 2:
        return panel === "workshop";
      case 3:
        return panel === "garden";
      case 4:
        // Show in garden; hide while memory tree panel is open (user can browse it)
        return panel === "garden";
      case 5:
        return panel === "garden";
      default:
        return false;
    }
  })();

  // Timer-based auto-advance for step 4 (resets if user leaves the panel)
  useEffect(() => {
    if (!visible) return;
    if (currentStep !== 4 || stepDef.advanceOn !== "click-or-timer") return;
    const t = setTimeout(advanceStep, stepDef.timerMs ?? 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, visible]);

  const showButton =
    stepDef.advanceOn === "button" ||
    stepDef.advanceOn === "got-it" ||
    stepDef.advanceOn === "click-or-timer";

  return (
    <>
      <TutorialSpotlight targetSelector={visible ? stepDef.target : null} visible={visible} />

      <TutorialTooltip
        targetSelector={visible ? stepDef.target : null}
        headline={stepDef.headline}
        instruction={stepDef.instruction}
        showButton={showButton}
        buttonLabel={stepDef.buttonLabel}
        onAdvance={advanceStep}
        visible={visible}
      />

      {/* Skip tutorial — always visible during steps 0–5 */}
      <button
        type="button"
        onClick={skipTutorial}
        style={{
          position: "fixed",
          bottom: 18,
          right: 22,
          zIndex: 10000,
          background: "none",
          border: "none",
          color: "rgba(247,241,228,0.55)",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'Mulish', system-ui, sans-serif",
          cursor: "pointer",
          padding: "4px 0",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          letterSpacing: "0.03em",
        }}
      >
        Skip tutorial
      </button>
    </>
  );
}

// ---------------------------------------------------------------------------

function CelebrationOverlay({
  onDismiss,
  timerMs,
}: {
  onDismiss: () => void;
  timerMs: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, timerMs);
    return () => clearTimeout(t);
  }, [onDismiss, timerMs]);

  return (
    <div
      role="dialog"
      aria-label="Tutorial complete"
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(247,241,228,0.94)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        animation: "tutorial-tooltip-in 400ms ease both",
        fontFamily: "'Mulish', system-ui, sans-serif",
      }}
    >
      <span
        style={{ fontSize: 72, lineHeight: 1, marginBottom: 20 }}
        aria-hidden
      >
        🌿
      </span>
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 700,
          fontSize: 34,
          color: "#3a3a2c",
          margin: "0 0 10px",
          textAlign: "center",
        }}
      >
        You&rsquo;re all set.
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "#5f5c49",
          margin: 0,
          textAlign: "center",
        }}
      >
        Your garden is waiting. 🌸
      </p>
    </div>
  );
}
