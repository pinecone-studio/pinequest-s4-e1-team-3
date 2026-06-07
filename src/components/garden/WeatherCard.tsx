// ============================================
//  WeatherCard.tsx
//
//  "Emotional weather" stack shown over the garden scene: a small
//  "today feels like" pill plus a 7-day forecast card underneath.
//  Pulls the last 7 days from GET /api/forecast?period=weekly and
//  renders one chip per day — color comes straight from the
//  backend's rippleColor (derived from the dominant mood), so this
//  file never has to know how moods map to colors.
//
//  WEATHER_EMOJI and WEATHER_PHRASES are purely cosmetic lookups
//  (the backend only sends the raw weather key, e.g. "partly_cloudy");
//  everything else — which day was dominant, what color it gets —
//  comes straight from the API response.
// ============================================

"use client";

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

export function WeatherCard() {
  const { data: days, loading, error } = useFetchJson<ForecastDay[]>("/api/forecast?period=weekly");

  if (loading || error || !days?.length) return null;

  const today = days[days.length - 1];

  return (
    <>
      <div className="garden-weather-pill">
        <span className="label">
          <span className="icon" aria-hidden>
            {WEATHER_EMOJI[today.weather] ?? "🌥️"}
          </span>
          <span>
            <span className="eyebrow">Today feels like</span>
            <span className="value">{WEATHER_PHRASES[today.weather] ?? "Calm skies"}</span>
          </span>
        </span>
        <span className="chevron" aria-hidden>
          ▾
        </span>
      </div>

      <div className="garden-forecast-card">
        <p className="garden-forecast-eyebrow">This past week</p>
        <div className="garden-forecast-days">
          {days.map((day) => (
            <div key={day.date} className="garden-forecast-day">
              <span className="icon" aria-hidden>
                {WEATHER_EMOJI[day.weather] ?? "🌥️"}
              </span>
              <span className="dot" style={{ background: day.rippleColor }} />
              <span className="name">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
        <p className="garden-forecast-caption">a week of how your garden felt</p>
      </div>
    </>
  );
}
