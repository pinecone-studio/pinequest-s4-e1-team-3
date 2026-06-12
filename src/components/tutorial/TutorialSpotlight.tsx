"use client";

import { useEffect, useRef, useState } from "react";

interface SpotRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface TutorialSpotlightProps {
  targetSelector: string | null;
  visible: boolean;
}

const PADDING = 14;
const DIM_BG = "rgba(20,18,10,0.55)";
const BLUR = "blur(1px)";
const TRANSITION = "opacity 250ms ease";

export function TutorialSpotlight({ targetSelector, visible }: TutorialSpotlightProps) {
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function measure() {
    if (!targetSelector) {
      setSpot(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-target="${targetSelector}"]`
    );
    if (!el) return; // will be retried by interval

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // If the element covers almost the full screen (e.g., garden-scene at step 0),
    // treat it as "no cutout" so the overlay is invisible.
    const fillsScreen = r.width >= vw * 0.88 && r.height >= vh * 0.88;
    if (fillsScreen) {
      setSpot(null);
      return;
    }

    setSpot({
      left: Math.max(0, r.left - PADDING),
      top: Math.max(0, r.top - PADDING),
      right: Math.min(vw, r.right + PADDING),
      bottom: Math.min(vh, r.bottom + PADDING),
    });
  }

  useEffect(() => {
    if (!visible) return;

    measure();

    // Poll every 300 ms so the spotlight follows garden pan transforms
    // and catches elements that appear in the DOM after async data fetches.
    retryRef.current = setInterval(measure, 300);

    window.addEventListener("resize", measure);

    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, visible]);

  if (!visible) return null;

  const base: React.CSSProperties = {
    position: "fixed",
    background: DIM_BG,
    backdropFilter: BLUR,
    WebkitBackdropFilter: BLUR,
    zIndex: 9998,
    pointerEvents: "none",
    transition: TRANSITION,
  };

  // No cutout — dim the whole screen (step 0 full-screen target, or target not found yet)
  if (!spot) {
    return <div style={{ ...base, inset: 0, opacity: targetSelector ? 0 : 0.65 }} />;
  }

  const { left, top, right, bottom } = spot;
  const w = right - left;
  const h = bottom - top;

  // Four panels surrounding the spotlight rectangle
  return (
    <>
      {/* top strip */}
      <div style={{ ...base, left: 0, top: 0, right: 0, height: top }} />
      {/* bottom strip */}
      <div style={{ ...base, left: 0, top: bottom, right: 0, bottom: 0 }} />
      {/* left strip */}
      <div style={{ ...base, left: 0, top, width: left, height: h }} />
      {/* right strip */}
      <div style={{ ...base, left: right, top, right: 0, height: h }} />
    </>
  );
}
