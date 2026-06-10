// ============================================
//  moodMapping.ts
//
//  Single source of truth for all mood-related conversions.
//  Used by:
//    - memoryPipeline.ts  → when creating MoodEntry after conversation completes
//    - /api/forecast      → when converting stored moods to weather for display
//    - /api/mood          → reference for frontend on what values to expect
//
//  The AI pipeline detects a mood string from the conversation.
//  These maps convert that string into:
//    rippleColor → hex color for the pond ripple animation
//    weather     → metaphor used in the Forecast timeline
//    intensity   → a starting intensity value (frontend can override)
// ============================================

// Mood → pond ripple hex color
// Frontend uses this color for the water wave animation when the stone lands.
export const MOOD_COLORS: Record<string, string> = {
  happy:      "#F9A825", // warm yellow/orange
  calm:       "#42A5F5", // soft blue
  sad:        "#90A4AE", // muted gray-blue
  anxious:    "#EF5350", // light red
  motivated:  "#66BB6A", // fresh green
  reflective: "#AB47BC", // muted purple
  confused:   "#78909C", // foggy gray
  angry:      "#FF7043", // deep orange-red
  grateful:   "#FFD54F", // golden yellow
};

// Mood → weather metaphor
// Used in the Forecast feature to show an emotional weather timeline.
// Each day is assigned the dominant mood's weather.
export const MOOD_TO_WEATHER: Record<string, string> = {
  happy:      "sunny",
  calm:       "partly_cloudy",
  motivated:  "clear_sky",
  sad:        "rainy",
  anxious:    "windy",
  confused:   "foggy",
  reflective: "cloudy",
  angry:      "stormy",
  grateful:   "sunny",
};

// Mood → base intensity (1–5)
// Controls the size of the stone and the strength of the ripple in the pond.
// Higher intensity = more emotionally charged conversation.
export const MOOD_INTENSITY: Record<string, number> = {
  happy:      4,
  calm:       2,
  sad:        3,
  anxious:    4,
  motivated:  5,
  reflective: 3,
  confused:   3,
  angry:      5,
  grateful:   4,
};

// Valid moods the AI pipeline can return.
// If the AI returns something outside this list, we fall back to "reflective".
export const VALID_MOODS = Object.keys(MOOD_COLORS);
export const DEFAULT_MOOD = "reflective";

// Helper: get ripple color for a mood, with fallback
export function getRippleColor(mood: string): string {
  return MOOD_COLORS[mood] ?? MOOD_COLORS[DEFAULT_MOOD];
}

// Helper: get weather for a mood, with fallback
export function getWeather(mood: string): string {
  return MOOD_TO_WEATHER[mood] ?? MOOD_TO_WEATHER[DEFAULT_MOOD];
}

// Helper: get weather considering both mood and intensity (1–5)
// intensity 1–2 = mild, 3 = moderate, 4–5 = strong
export function getWeatherByIntensity(mood: string, intensity: number): string {
  const level = intensity <= 2 ? "low" : intensity >= 4 ? "high" : "mid";
  const matrix: Record<string, Record<string, string>> = {
    sad:        { low: "light_rain", mid: "rainy",        high: "heavy_rain" },
    anxious:    { low: "windy",      mid: "windy",        high: "stormy"     },
    angry:      { low: "windy",      mid: "stormy",       high: "stormy"     },
    happy:      { low: "partly_cloudy", mid: "sunny",     high: "clear_sky"  },
    calm:       { low: "partly_cloudy", mid: "partly_cloudy", high: "clear_sky" },
    grateful:   { low: "sunny",     mid: "sunny",         high: "clear_sky"  },
    motivated:  { low: "sunny",     mid: "clear_sky",     high: "clear_sky"  },
    reflective: { low: "cloudy",    mid: "cloudy",        high: "cloudy"     },
    confused:   { low: "foggy",     mid: "foggy",         high: "foggy"      },
  };
  return matrix[mood]?.[level] ?? getWeather(mood);
}

// Helper: get intensity for a mood, with fallback
export function getIntensity(mood: string): number {
  return MOOD_INTENSITY[mood] ?? MOOD_INTENSITY[DEFAULT_MOOD];
}

// Helper: given an array of mood strings from one day,
// returns the most frequent mood. On a tie, returns the most recent.
// Used by GET /api/forecast to compute the daily dominant mood.
export function getDominantMood(
  moods: Array<{ mood: string; date: Date }>
): string {
  if (moods.length === 0) return DEFAULT_MOOD;

  // Count each mood
  const count: Record<string, number> = {};
  for (const { mood } of moods) {
    count[mood] = (count[mood] ?? 0) + 1;
  }

  const maxCount = Math.max(...Object.values(count));
  const topMoods = Object.keys(count).filter((m) => count[m] === maxCount);

  // Single winner
  if (topMoods.length === 1) return topMoods[0];

  // Tie — return the mood of the most recent entry
  const sorted = [...moods].sort((a, b) => b.date.getTime() - a.date.getTime());
  return sorted.find((s) => topMoods.includes(s.mood))!.mood;
}
