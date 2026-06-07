"use client";

import Image from "next/image";
import { useState } from "react";

const SETTLED_TRANSFORM = "translate(-50%, 8.5vw) scale(0.32)";

type Phase = "idle" | "falling" | "settled" | "sinking";

export function PondPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");

  function handleDrop() {
    if (phase !== "idle") return;
    setPhase("falling");
    setTimeout(() => {
      setPhase("sinking");
      setTimeout(() => {
        setPhase("idle");
      }, 1400);
    }, 1100);
  }

  const showStone = phase === "falling" || phase === "settled" || phase === "sinking";
  const isSettled = phase === "settled" || phase === "sinking";

  return (
    <div style={{
      position: "absolute",
      inset: 0,
      zIndex: 40,
      background: "rgba(10, 12, 8, 0.52)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "garden-fade 0.2s ease",
    }}>
    <div style={{
      position: "relative",
      width: "min(82vw, min(1100px, 85vh * 1328 / 752))",
      aspectRatio: "1328 / 752",
      borderRadius: 20,
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
    }}>
      <style>{`
        @keyframes stone-fall {
          0%   { transform: translate(-50%, 0) scale(1); }
          60%  { transform: translate(-50%, 5vw) scale(0.55); }
          100% { transform: ${SETTLED_TRANSFORM}; }
        }
        @keyframes stone-sink {
          0%   { transform: ${SETTLED_TRANSFORM}; opacity: 1; }
          100% { transform: translate(-50%, 14vw) scale(0.18); opacity: 0; }
        }
        @keyframes ripple-expand {
          0%   { transform: translate(-50%, -50%) scale(0.02); opacity: 0.75; }
          60%  { opacity: 0.45; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>

      <Image
        src="/garden/pond-zoomed.png"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "contain" }}
      />
      <div className="garden-scene-panel-scrim" />

      <div className="garden-scene-panel-back">
        <button
          type="button"
          className="garden-scene-panel-back-btn"
          onClick={onClose}
          aria-label="Back to garden"
        >
          ‹
        </button>
        <h2 className="garden-scene-panel-title">Mood Pond</h2>
      </div>

      <div
        style={{
          position: "absolute",
          top: "28%",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 2,
          padding: "0 32px",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontStyle: "italic",
            fontSize: "clamp(26px, 3.6vw, 46px)",
            fontWeight: 500,
            color: "var(--g-ivory)",
            textShadow: "0 4px 28px rgba(0,0,0,0.45)",
            margin: "0 0 14px",
            lineHeight: 1.2,
          }}
        >
          {isSettled ? "Your stone has settled" : "Toss a stone into the water"}
        </p>
        <p
          style={{
            fontSize: 15,
            color: "rgba(240, 237, 232, 0.82)",
            textShadow: "0 2px 14px rgba(0,0,0,0.45)",
            margin: 0,
            letterSpacing: 0.2,
          }}
        >
          {isSettled
            ? "It rests where it landed · watch the ripples fade"
            : "A quiet moment — drop a single stone and let it ripple"}
        </p>
      </div>

      {phase === "sinking" && (
        <>
          {[0, 200, 400, 600, 800, 1000].map((delay) => {
            return (
              <span
                key={delay}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "calc(12% + 12vw)",
                  width: 850,
                  height: 350,
                  borderRadius: "50%",
                  border: `3px solid hsla(0, 90%, 55%, 0.85)`,
                  zIndex: 9,
                  pointerEvents: "none",
                  animation: `ripple-expand 2.4s ease-out ${delay}ms both`,
                }}
              />
            );
          })}
        </>
      )}

      {showStone && (
        <Image
          src="/garden/stone.png"
          alt=""
          width={140}
          height={140}
          style={{
            position: "absolute",
            top: "12%",
            left: "50%",
            height: "auto",
            zIndex: 10,
            pointerEvents: "none",
            mixBlendMode: "multiply",
            animation:
              phase === "falling" || phase === "settled"
                ? "stone-fall 1.0s cubic-bezier(0.4, 0, 1, 1) forwards"
                : "stone-sink 1.4s ease-in forwards",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          bottom: "11%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        {isSettled ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(30,28,26,0.82)",
              color: "#f0ede8",
              border: "none",
              borderRadius: 999,
              padding: "13px 28px",
              fontSize: 15.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 10px 36px rgba(0,0,0,0.3)",
              backdropFilter: "blur(10px)",
              letterSpacing: 0.1,
            }}
          >
            Stone placed
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDrop}
            disabled={phase === "falling"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: phase === "falling" ? "rgba(247,241,228,0.55)" : "rgba(247, 241, 228, 0.93)",
              color: "#2a2720",
              border: "none",
              borderRadius: 999,
              padding: "13px 28px",
              fontSize: 15.5,
              fontWeight: 600,
              cursor: phase === "falling" ? "default" : "pointer",
              boxShadow: "0 10px 36px rgba(0,0,0,0.3)",
              backdropFilter: "blur(10px)",
              letterSpacing: 0.1,
              transition: "background 0.2s",
            }}
          >
            <Image
              src="/garden/stone.png"
              alt=""
              width={36}
              height={36}
              style={{ height: "auto", opacity: phase === "falling" ? 0.4 : 1, mixBlendMode: "multiply" }}
            />
            Drop a stone
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
