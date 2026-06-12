"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface TooltipPos {
  top: number;
  left: number;
}

interface TutorialTooltipProps {
  targetSelector: string | null;
  headline: string;
  instruction: string;
  showButton: boolean;
  buttonLabel?: string;
  onAdvance: () => void;
}

const TOOLTIP_W = 330;
const TOOLTIP_H_BASE = 132; // rough height without button
const TOOLTIP_H_BTN = 162; // rough height with button
const GAP = 20; // space between tooltip and target

export function TutorialTooltip({
  targetSelector,
  headline,
  instruction,
  showButton,
  buttonLabel = "Ойлголоо →",
  onAdvance,
}: TutorialTooltipProps) {
  const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0 });
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function calcPos() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipH = showButton ? TOOLTIP_H_BTN : TOOLTIP_H_BASE;

    const el = targetSelector
      ? document.querySelector<HTMLElement>(
          `[data-tutorial-target="${targetSelector}"]`,
        )
      : null;

    // Full-screen target or element not found → center on screen
    const isFullScreen =
      !el ||
      (el.getBoundingClientRect().width >= vw * 0.88 &&
        el.getBoundingClientRect().height >= vh * 0.88);

    if (isFullScreen) {
      setPos({
        top: vh / 2 - tooltipH / 2,
        left: Math.max(12, vw / 2 - TOOLTIP_W / 2),
      });
      return;
    }

    const r = el!.getBoundingClientRect();
    const midX = r.left + r.width / 2;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;

    let top: number;
    if (spaceBelow >= tooltipH + GAP) {
      top = r.bottom + GAP;
    } else if (spaceAbove >= tooltipH + GAP) {
      top = r.top - tooltipH - GAP;
    } else {
      top = Math.min(r.bottom + GAP, vh - tooltipH - 12);
    }

    // Center over target, clamped to viewport
    let left = midX - TOOLTIP_W / 2;
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));

    setPos({ top, left });
  }

  useEffect(() => {
    calcPos();
    retryRef.current = setInterval(calcPos, 200);
    window.addEventListener("resize", calcPos);

    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      window.removeEventListener("resize", calcPos);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, showButton]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 7 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 7 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: TOOLTIP_W,
        zIndex: 9999,
        background: "rgba(247,241,228,0.97)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderRadius: 16,
        padding: "16px 20px 14px",
        boxShadow:
          "0 8px 40px rgba(40,34,18,0.22), 0 0 0 1px rgba(216,194,122,0.28)",
        pointerEvents: "auto",
        fontFamily: "'Mulish', system-ui, sans-serif",
      }}
    >
      <p
        style={{
          margin: "0 0 5px",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 700,
          fontSize: 18,
          color: "#3a3a2c",
          lineHeight: 1.2,
        }}
      >
        {headline}
      </p>
      <p
        style={{
          margin: showButton ? "0 0 12px" : "0 0 10px",
          fontSize: 13,
          color: "#5f5c49",
          lineHeight: 1.55,
        }}
      >
        {instruction}
      </p>

      {showButton ? (
        <button
          type="button"
          onClick={onAdvance}
          style={{
            background: "#3a3a2c",
            color: "#f7f1e4",
            border: "none",
            borderRadius: 8,
            padding: "7px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "'Mulish', system-ui, sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          {buttonLabel}
        </button>
      ) : (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#9aa87f",
              display: "inline-block",
              flexShrink: 0,
              animation: "tutorial-pulse-dot 1.2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#9aa87f",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            үргэлжлүүлэхийн тулд дарна уу
          </span>
        </span>
      )}
    </motion.div>
  );
}
