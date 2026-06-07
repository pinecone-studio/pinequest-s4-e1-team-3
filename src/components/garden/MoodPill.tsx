// ============================================
//  MoodPill.tsx
//
//  Floating "mood" chip shown over the garden scene. Pulls the same
//  weekly forecast as WeatherCard (GET /api/forecast?period=weekly)
//  and surfaces today's dominant mood as a friendly phrase, with a
//  dropdown of the week's other distinct moods underneath — each
//  tinted with the backend's own rippleColor so this file never has
//  to know how moods map to colors.
//
//  MOOD_PHRASES is purely cosmetic (mirrors WEATHER_EMOJI's job in
//  WeatherCard): it turns the backend's single-word mood keys into
//  the warmer, more poetic copy the rest of the Garden uses.
// ============================================

"use client";

import { useState } from "react";
import { useFetchJson } from "@/hooks/useFetchJson";
import type { ForecastDay } from "./types";

const MOOD_PHRASES: Record<string, string> = {
  calm: "Calm & Hopeful",
  happy: "Bright",
  grateful: "Grateful",
  sad: "A little heavy",
  reflective: "Tender",
  anxious: "Restless",
  motivated: "Driven",
  confused: "Hazy",
  angry: "Fiery",
};

function moodPhrase(mood: string) {
  return MOOD_PHRASES[mood] ?? mood.charAt(0).toUpperCase() + mood.slice(1);
}

export function MoodPill() {
  const { data: days } = useFetchJson<ForecastDay[]>("/api/forecast?period=weekly");
  const [open, setOpen] = useState(false);

  if (!days || days.length === 0) return null;

  const today = days[days.length - 1];

  // Distinct moods across the week, most-recent first
  const recent: ForecastDay[] = [];
  const seen = new Set<string>();
  for (let i = days.length - 1; i >= 0; i--) {
    if (!seen.has(days[i].mood)) {
      seen.add(days[i].mood);
      recent.push(days[i]);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="garden-pill-btn" onClick={() => setOpen((o) => !o)}>
        <span className="eyebrow">Mood</span>
        <span className="value">{moodPhrase(today.mood)}</span>
        <span className="garden-pill-dot" style={{ background: today.rippleColor }} />
      </button>

      {open && (
        <div className="garden-mood-dropdown">
          {recent.map((day) => (
            <div key={day.mood} className="garden-mood-row">
              <span className="garden-pill-dot" style={{ background: day.rippleColor }} />
              {moodPhrase(day.mood)}
              {day.mood === today.mood && (
                <span className="heart" aria-hidden>
                  ♥
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
