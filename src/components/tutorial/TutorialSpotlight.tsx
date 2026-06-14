"use client";

import { useEffect, useRef, useState } from "react";

interface SpotRect {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
}

interface TutorialSpotlightProps {
  targetSelector: string | null;
  visible: boolean;
  /** Entry-point landmarks (Greenhouse) get a noticeably bigger glow. */
  large?: boolean;
  /** Full-width UI (the pond stone controls) — frame the whole thing. */
  wide?: boolean;
  /** Extra px added to the cutout height (grows up + down evenly). */
  extraHeight?: number;
}

const DIM = "rgba(20,18,10,0.62)";

export function TutorialSpotlight({
  targetSelector,
  visible,
  large = false,
  wide = false,
  extraHeight = 0,
}: TutorialSpotlightProps) {
  const [spot, setSpot] = useState<SpotRect | null>(null);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Large landmarks / wide UI get more padding and a bigger clamp so the
  // spotlight reads as a genuine glowing focal point, not a subtle hint.
  const big = large || wide;
  const PADDING = wide ? 40 : large ? 30 : 16;
  const MAX_W = wide ? 1320 : large ? 900 : 720;
  const MAX_H = wide ? 400 : large ? 520 : 340;

  function measure() {
    if (!targetSelector) {
      setSpot(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-target="${targetSelector}"]`,
    );
    if (!el) return; // will be retried by interval

    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Full-screen-ish target (e.g. garden-scene) → no cutout.
    const fillsScreen = r.width >= vw * 0.88 && r.height >= vh * 0.88;
    if (fillsScreen) {
      setSpot(null);
      return;
    }

    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const width = Math.min(r.width + PADDING * 2, Math.min(MAX_W, vw * (wide ? 0.96 : large ? 0.9 : 0.82)));
    const height = Math.min(
      r.height + PADDING * 2 + extraHeight,
      Math.min(MAX_H, vh * (large ? 0.72 : 0.5)),
    );

    const radius =
      Math.min(width, height) / 2 <= 70 ? Math.min(width, height) / 2 : big ? 34 : 26;

    setSpot({
      left: cx - width / 2,
      top: cy - height / 2,
      width,
      height,
      radius,
    });
  }

  useEffect(() => {
    if (!visible) return;
    measure();
    retryRef.current = setInterval(measure, 120);
    window.addEventListener("resize", measure);
    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, visible, large, wide, extraHeight]);

  if (!visible) return null;

  // No cutout — gentle full-screen dim while waiting for the target.
  if (!spot) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          pointerEvents: "none",
          background: DIM,
          opacity: targetSelector ? 0 : 0.7,
          transition: "opacity 300ms ease",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: spot.left,
        top: spot.top,
        width: spot.width,
        height: spot.height,
        borderRadius: spot.radius,
        zIndex: 9998,
        pointerEvents: "none",
        boxShadow: `0 0 0 9999px ${DIM}`,
        transition:
          "left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease, border-radius 220ms ease",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          animation: `${
            big ? "tutorial-spotlight-pulse-lg" : "tutorial-spotlight-pulse"
          } 1.8s ease-in-out infinite`,
        }}
      />
    </div>
  );
}
