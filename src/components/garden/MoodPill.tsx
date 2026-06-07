// ============================================
//  MoodPill.tsx
//
//  Floating "today's mood" chip shown over the garden scene, styled
//  like a little weather forecast: a weather emoji paired with the
//  day's conditions. Press it and it opens upward into a forecast-style
//  rundown of the past week — one row per day, each with its own
//  weather icon, mood, and ripple tint, so this file never has to know
//  how moods map to colors (that comes straight from the backend's
//  rippleColor).
//
//  WEATHER_EMOJI / WEATHER_PHRASES / MOOD_PHRASES are purely cosmetic
//  lookups (the backend only sends raw keys like "partly_cloudy" or
//  "calm"); everything else — which day was dominant, what color it
//  gets — comes straight from the API response.
// ============================================

"use client";

import { useState } from "react";
import { useFetchJson } from "@/hooks/useFetchJson";
import type { ForecastDay } from "./types";

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️",
  partly_cloudy: "🌤️",
  clear_sky: "🌞",
  rainy: "🌧️",
  windy: "💨",
  foggy: "🌫️",
  cloudy: "☁️",
  stormy: "⛈️",
};

const WEATHER_PHRASES: Record<string, string> = {
  sunny: "Bright skies",
  partly_cloudy: "Calm skies",
  clear_sky: "Clear skies",
  rainy: "Soft rain",
  windy: "Restless winds",
  foggy: "Hazy mist",
  cloudy: "Quiet clouds",
  stormy: "Heavy storms",
};

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
  const { data } = useFetchJson<ForecastDay[]>("/api/forecast?period=weekly");
  const [open, setOpen] = useState(false);

  if (!data || data.length === 0) return null;

  const days = data;
  const today = days[days.length - 1];

  return (
    <div style={{ position: "relative" }}>
      <button type="button" className="garden-pill-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span aria-hidden>{WEATHER_EMOJI[today.weather] ?? "🌥️"}</span>
        <span className="value">{WEATHER_PHRASES[today.weather] ?? "Calm skies"}</span>
      </button>

      {open && (
        <div className="garden-mood-dropdown">
          <p className="garden-mood-dropdown-eyebrow">This past week</p>
          {days.map((day) => (
            <div key={day.date} className="garden-mood-row">
              <span className="icon" aria-hidden>
                {WEATHER_EMOJI[day.weather] ?? "🌥️"}
              </span>
              <span className="garden-pill-dot" style={{ background: day.rippleColor }} />
              <span className="name">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="mood">{moodPhrase(day.mood)}</span>
              {day.date === today.date && (
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
