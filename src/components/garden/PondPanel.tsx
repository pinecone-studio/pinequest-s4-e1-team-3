"use client";

import Image from "next/image";
import { useState } from "react";
import { useFetchJson } from "@/hooks/useFetchJson";
import type { Stone, ForecastDay } from "./types";

const SETTLED_TRANSFORM = "translate(-50%, 8.5vw) scale(0.32)";

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️", partly_cloudy: "🌤️", clear_sky: "🌞",
  rainy: "🌧️", windy: "💨", foggy: "🌫️", cloudy: "☁️", stormy: "⛈️",
};

const MOOD_PHRASES: Record<string, string> = {
  calm: "Calm & Hopeful", happy: "Bright", grateful: "Grateful",
  sad: "A little heavy", reflective: "Tender", anxious: "Restless",
  motivated: "Driven", confused: "Hazy", angry: "Fiery",
};

type Phase = "idle" | "falling" | "settled" | "sinking";

function playSplash() {
  try {
    const audio = new Audio("/garden/Water Splash Sound Effect  Free Clip Sounds  Ambient Sounds.mp3");
    audio.volume = 0.6;
    audio.currentTime = 2;
    audio.play();
  } catch {}
}

export function PondPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const { data: stones } = useFetchJson<Stone[]>("/api/mood?limit=1");
  const { data: forecast } = useFetchJson<ForecastDay[]>("/api/forecast?period=daily");
  const rippleColor = stones?.[0]?.rippleColor ?? "#42A5F5";
  const today = forecast?.[forecast.length - 1];

  function handleDrop() {
    if (phase !== "idle") return;
    setPhase("falling");
    setTimeout(() => {
      playSplash();
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
        @keyframes drop-spray {
          0%   { transform: translateY(0) scale(1); opacity: 1; }
          35%  { transform: translateY(var(--peak, -60px)) scale(0.8); opacity: 0.9; }
          100% { transform: translateY(22px) scale(0.05); opacity: 0; }
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

      {today && (
        <div style={{
          position: "absolute",
          top: 28,
          right: 28,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(247,241,228,0.18)",
          backdropFilter: "blur(10px)",
          borderRadius: 999,
          padding: "7px 14px",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 18 }}>{WEATHER_EMOJI[today.weather] ?? "🌥️"}</span>
          <div>
            <div style={{ fontSize: 11, color: "rgba(240,237,232,0.65)", letterSpacing: 0.3, lineHeight: 1 }}>
              Today
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--g-ivory)", lineHeight: 1.3 }}>
              {MOOD_PHRASES[today.mood] ?? today.mood}
            </div>
          </div>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: today.rippleColor, flexShrink: 0,
          }} />
        </div>
      )}

      {phase === "sinking" && (
        <>
          {[
            { angle: -2,   peak: -105, size: 9,  delay: 0,   dur: 0.95, w: 6  },
            { angle: 3,    peak: -95,  size: 8,  delay: 15,  dur: 0.9,  w: 5  },
            { angle: -18,  peak: -85,  size: 7,  delay: 10,  dur: 0.85, w: 5  },
            { angle: 20,   peak: -80,  size: 7,  delay: 20,  dur: 0.82, w: 4  },
            { angle: -38,  peak: -65,  size: 6,  delay: 5,   dur: 0.75, w: 4  },
            { angle: 40,   peak: -60,  size: 6,  delay: 25,  dur: 0.72, w: 4  },
            { angle: -60,  peak: -45,  size: 5,  delay: 15,  dur: 0.65, w: 3  },
            { angle: 62,   peak: -42,  size: 5,  delay: 30,  dur: 0.63, w: 3  },
            { angle: -80,  peak: -30,  size: 4,  delay: 20,  dur: 0.58, w: 3  },
            { angle: 82,   peak: -28,  size: 4,  delay: 35,  dur: 0.55, w: 2  },
            { angle: -100, peak: -18,  size: 3,  delay: 40,  dur: 0.5,  w: 2  },
            { angle: 102,  peak: -16,  size: 3,  delay: 45,  dur: 0.48, w: 2  },
            { angle: -28,  peak: -50,  size: 3,  delay: 55,  dur: 0.6,  w: 2  },
            { angle: 30,   peak: -48,  size: 3,  delay: 60,  dur: 0.58, w: 2  },
            { angle: 10,   peak: -70,  size: 4,  delay: 35,  dur: 0.78, w: 3  },
          ].map(({ angle, peak, size, delay, dur, w }) => { const s = 2.2; return (
            <span
              key={`${angle}-${delay}`}
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(12% + 8.5vw)",
                width: 0,
                height: 0,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                zIndex: 11,
                pointerEvents: "none",
              }}
            >
              <span style={{
                position: "absolute",
                width: Math.round(w * s),
                height: Math.round(size * s),
                borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
                background: rippleColor + "ee",
                ["--peak" as string]: `${peak}px`,
                animation: `drop-spray ${dur}s cubic-bezier(0.25,0.8,0.5,1) ${delay}ms both`,
                boxShadow: "0 0 3px rgba(150,210,240,0.5)",
              } as React.CSSProperties} />
            </span>
          ); })}
        </>
      )}

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
                  border: `3px solid ${rippleColor}cc`,
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
