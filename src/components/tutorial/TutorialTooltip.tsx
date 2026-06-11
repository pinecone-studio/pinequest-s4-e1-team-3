"use client";

import { useEffect, useRef, useState } from "react";

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
  visible: boolean;
}

const TOOLTIP_W = 320;
const TOOLTIP_H_BASE = 118; // rough height without button
const TOOLTIP_H_BTN = 148;  // rough height with button
const GAP = 18; // space between tooltip and target

export function TutorialTooltip({
  targetSelector,
  headline,
  instruction,
  showButton,
  buttonLabel = "Got it →",
  onAdvance,
  visible,
}: TutorialTooltipProps) {
  const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0 });
  const [arrowDir, setArrowDir] = useState<"down" | "up" | "none">("none");
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function calcPos() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipH = showButton ? TOOLTIP_H_BTN : TOOLTIP_H_BASE;

    if (!targetSelector) {
      setPos({
        top: vh / 2 - tooltipH / 2,
        left: Math.max(12, vw / 2 - TOOLTIP_W / 2),
      });
      return;
    }

    const el = document.querySelector<HTMLElement>(
      `[data-tutorial-target="${targetSelector}"]`
    );

    // Full-screen target or element not found → center in screen
    const isFullScreen =
      !el ||
      (el.getBoundingClientRect().width >= vw * 0.88 &&
        el.getBoundingClientRect().height >= vh * 0.88);

    if (isFullScreen) {
      setPos({
        top: vh / 2 - tooltipH / 2,
        left: Math.max(12, vw / 2 - TOOLTIP_W / 2),
      });
      setArrowDir("none");
      return;
    }

    const r = el!.getBoundingClientRect();
    const midX = r.left + r.width / 2;
    const spaceBelow = vh - r.bottom;
    const spaceAbove = r.top;

    let top: number;
    let dir: "down" | "up" = "up";
    if (spaceBelow >= tooltipH + GAP) {
      top = r.bottom + GAP;
      dir = "up"; // tooltip is below target, arrow points up toward it
    } else if (spaceAbove >= tooltipH + GAP) {
      top = r.top - tooltipH - GAP;
      dir = "down"; // tooltip is above target, arrow points down toward it
    } else {
      top = Math.min(r.bottom + GAP, vh - tooltipH - 12);
      dir = "up";
    }
    setArrowDir(dir);

    // Center over target, clamped to viewport
    let left = midX - TOOLTIP_W / 2;
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));

    setPos({ top, left });
  }

  useEffect(() => {
    if (!visible) return;

    calcPos();
    retryRef.current = setInterval(calcPos, 300);
    window.addEventListener("resize", calcPos);

    return () => {
      if (retryRef.current) clearInterval(retryRef.current);
      window.removeEventListener("resize", calcPos);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSelector, visible, showButton]);

  if (!visible) return null;

  return (
    <div
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
        animation: "tutorial-tooltip-in 200ms ease both",
      }}
    >
      {arrowDir === "down" && (
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: "50%",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "11px solid rgba(247,241,228,0.97)",
            animation: "tutorial-arrow-bounce-down 0.9s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
      {arrowDir === "up" && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: "50%",
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "11px solid rgba(247,241,228,0.97)",
            animation: "tutorial-arrow-bounce-up 0.9s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
      )}
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
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
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
            click to continue
          </span>
        </span>
      )}
    </div>
  );
}
