"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTutorial } from "./TutorialContext";
import { TutorialSpotlight } from "./TutorialSpotlight";
import { TutorialTooltip } from "./TutorialTooltip";
import { TUTORIAL_STEPS } from "./steps";

interface TutorialOverlayProps {
  /** The currently active garden panel (from GardenShell state). */
  panel: string;
}

// Small delay before revealing the spotlight + tooltip, so a panel mount /
// garden pan can begin settling first. (No scrollIntoView — the garden is
// custom-panned; native scrolling pushed landmarks off-screen and left the
// page scrolled so dragging broke afterwards.)
const REVEAL_DELAY_MS = 150;

/**
 * Renders the active tutorial step: it scrolls the target into view, then
 * (after a short delay) shows the spotlight cutout and the anchored tooltip.
 * The closing step renders a full-screen celebration instead.
 */
export function TutorialOverlay({ panel }: TutorialOverlayProps) {
  const {
    tutorialActive,
    currentStep,
    companion,
    advanceStep,
    skipTutorial,
    completeTutorial,
  } = useTutorial();

  const stepDef = TUTORIAL_STEPS[currentStep];
  const isClosing = !!stepDef && stepDef.advanceOn === "auto";

  // A normal step is visible once its panel is the one on screen.
  const visible =
    !!tutorialActive && !!stepDef && stepDef.panel !== null && stepDef.panel === panel;

  // ----- auto-scroll target into view, then arm the spotlight/tooltip -----
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!visible || !stepDef) {
      setArmed(false);
      return;
    }
    setArmed(false);
    let cancelled = false;

    const t = setTimeout(() => {
      if (!cancelled) setArmed(true);
    }, REVEAL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [currentStep, visible, stepDef]);

  // Fill {companion} / {domain} for the companion explanation step.
  const instruction = useMemo(() => {
    let s = stepDef?.instructionMn ?? "";
    if (stepDef?.target === "chat-companion") {
      s = s
        .replace("{companion}", companion?.name ?? "Sage")
        .replace("{domain}", companion?.domain ?? "сэтгэл хөдлөлийн ур чадвар");
    }
    return s;
  }, [stepDef, companion]);

  // ----- closing celebration -----
  if (tutorialActive && isClosing && stepDef) {
    return (
      <CelebrationOverlay
        headline={stepDef.headlineMn}
        body={stepDef.instructionMn}
        subline={stepDef.sublineMn}
        timerMs={stepDef.timerMs ?? 3000}
        onDismiss={completeTutorial}
      />
    );
  }

  if (!tutorialActive || !stepDef) return null;

  const showButton = stepDef.advanceOn === "got-it";
  const show = visible && armed;

  return (
    <>
      <TutorialSpotlight
        targetSelector={show && stepDef.spotlight !== "none" ? stepDef.target : null}
        visible={show && stepDef.spotlight !== "none"}
        large={stepDef.spotlight === "large"}
        wide={stepDef.spotlight === "wide"}
      />

      {/* AnimatePresence so the tooltip fades smoothly between sub-steps */}
      <AnimatePresence mode="wait">
        {show && (
          <TutorialTooltip
            key={currentStep}
            targetSelector={stepDef.target}
            headline={stepDef.headlineMn}
            instruction={instruction}
            showButton={showButton}
            buttonLabel={stepDef.buttonLabel}
            onAdvance={advanceStep}
          />
        )}
      </AnimatePresence>

      {/* Skip tutorial — always available while the tutorial is running */}
      {visible && (
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
            color: "rgba(247,241,228,0.7)",
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
          Заавар алгасах
        </button>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function CelebrationOverlay({
  headline,
  body,
  subline,
  timerMs,
  onDismiss,
}: {
  headline: string;
  body: string;
  subline?: string;
  timerMs: number;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, timerMs);
    return () => clearTimeout(t);
  }, [onDismiss, timerMs]);

  return (
    <motion.div
      role="dialog"
      aria-label="Tutorial complete"
      onClick={onDismiss}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(247,241,228,0.96)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: "0 28px",
        fontFamily: "'Mulish', system-ui, sans-serif",
      }}
    >
      <span style={{ fontSize: 64, lineHeight: 1, marginBottom: 18 }} aria-hidden>
        🌿
      </span>
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 700,
          fontSize: 34,
          color: "#3a3a2c",
          margin: "0 0 14px",
          textAlign: "center",
        }}
      >
        {headline}
      </h2>
      <p
        style={{
          fontSize: 15.5,
          color: "#5f5c49",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: 560,
        }}
      >
        {body}
      </p>
      {subline && (
        <p
          style={{
            marginTop: 18,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#7a9e72",
            textAlign: "center",
          }}
        >
          {subline}
        </p>
      )}
    </motion.div>
  );
}
