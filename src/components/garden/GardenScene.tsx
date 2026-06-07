// ============================================
//  GardenScene.tsx
//
//  The main field: a full-bleed painted illustration with every one
//  of the user's flowers placed at its stored (posX, posY) position,
//  plus the floating chrome that frames it — the welcome label, the
//  mood + time-of-day pills, the category filter bar, and the
//  pagination control that cycles the scene's time-of-day tint.
//
//  Flower data comes from GET /api/flowers (via useFetchJson — no
//  fetch logic lives here, only rendering + the "what happens on
//  click" decision):
//    - Flower with a conversation  → open its chat
//    - No flowers yet              → show the first-time hint and
//                                    let the user jump to the Workshop
//
//  Loading/error states are handled inline since they're one-line
//  each; the heavier per-flower rendering is delegated to FlowerSprite,
//  and the mood/weather widgets to MoodPill / WeatherCard.
// ============================================

"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFetchJson } from "@/hooks/useFetchJson";
import { FlowerSprite } from "./FlowerSprite";
import { MoodPill } from "./MoodPill";
import { WeatherCard } from "./WeatherCard";
import type { FlowerSummary } from "./types";

const FILTERS: { key: string; label: string; color?: string }[] = [
  { key: "all", label: "All" },
  { key: "career", label: "Career", color: "#d8c27a" },
  { key: "stress-relief", label: "Stress Relief", color: "#b6a8cf" },
  { key: "relationships", label: "Relationships", color: "#cf8aa0" },
  { key: "self-reflection", label: "Self-Reflection", color: "#9b8ec4" },
];

const TIME_PRESETS = [
  { key: "golden", label: "Golden hour", icon: "☀️", filter: "none", tint: "transparent" },
  {
    key: "evening",
    label: "Evening",
    icon: "🌙",
    filter: "brightness(0.55) saturate(0.7) hue-rotate(215deg)",
    tint: "rgba(64, 52, 110, 0.32)",
  },
];

export function GardenScene({
  onOpenWorkshop,
  userName,
}: {
  onOpenWorkshop: () => void;
  userName: string;
}) {
  const router = useRouter();
  const { data: flowers, loading, error } = useFetchJson<FlowerSummary[]>("/api/flowers");
  const [activeFilter, setActiveFilter] = useState("all");
  const [timeIndex, setTimeIndex] = useState(0);
  const time = TIME_PRESETS[timeIndex];

  function selectFlower(flower: FlowerSummary) {
    if (flower.conversationId) router.push(`/chat/${flower.conversationId}`);
  }

  function cycleTime(step: 1 | -1) {
    setTimeIndex((i) => (i + step + TIME_PRESETS.length) % TIME_PRESETS.length);
  }

  return (
    <section className="garden-scene">
      <Image
        src="/garden/garden-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", filter: time.filter }}
        className="garden-scene-bg"
      />
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: time.tint, pointerEvents: "none" }} />

      <p className="garden-welcome">{userName ? `Welcome back, ${userName}` : "Your garden"}</p>

      <div className="garden-weather-stack">
        <WeatherCard />
      </div>

      {(flowers ?? []).map((flower) => (
        <FlowerSprite key={flower.id} flower={flower} onSelect={selectFlower} />
      ))}

      {loading && <p className="garden-hint">Loading your garden…</p>}
      {error && <p className="garden-hint">Couldn’t load your garden — {error}</p>}
      {!loading && !error && (flowers?.length ?? 0) === 0 && (
        <button type="button" className="garden-hint" onClick={onOpenWorkshop}>
          Your garden is empty · visit the Workshop to plant your first flower
        </button>
      )}
      {!loading && (flowers?.length ?? 0) > 0 && (
        <p className="garden-hint">Click a flower to step into its conversation</p>
      )}

      <div className="garden-bottom-row">
        <div className="garden-bottom-stack">
          <MoodPill />
          <button type="button" className="garden-pill-btn" onClick={() => cycleTime(1)}>
            <span aria-hidden>{time.icon}</span>
            <span className="value">{time.label}</span>
          </button>
        </div>

        <div className="garden-filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={"garden-filter-pill" + (activeFilter === f.key ? " active" : "")}
              onClick={() => setActiveFilter(f.key)}
            >
              <span
                className="garden-filter-dot"
                style={{
                  background: f.color ?? "conic-gradient(var(--g-lotus), var(--g-gold), var(--g-sage), var(--g-lavender), var(--g-lotus))",
                }}
              />
              {f.label}
            </button>
          ))}
        </div>

        <div className="garden-pagination">
          <button type="button" aria-label="Previous time of day" onClick={() => cycleTime(-1)}>
            ‹
          </button>
          <span className="track">
            <span
              className="track-fill"
              style={{ width: `${((timeIndex + 1) / TIME_PRESETS.length) * 100}%` }}
            />
          </span>
          <button type="button" aria-label="Next time of day" onClick={() => cycleTime(1)}>
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
