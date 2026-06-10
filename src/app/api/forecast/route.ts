// ============================================
//  GET /api/forecast
//
//  Returns a day-by-day weather forecast based on the user's mood history.
//  Used by the Forecast feature to show an emotional timeline.
//
//  How it works:
//    1. Load all MoodEntry records for the requested period
//    2. Group by calendar day
//    3. For each day: find the dominant mood (most frequent)
//       On a tie: use the mood of the most recent stone that day
//    4. Map dominant mood → weather metaphor
//    5. Return one entry per day
//
//  Query params:
//    ?period=daily    → today only (1 entry)
//    ?period=weekly   → last 7 days (default)
//    ?period=monthly  → last 30 days
//
//  Response shape:
//  [
//    {
//      date: "2024-01-05",         ← ISO date string (YYYY-MM-DD)
//      mood: "reflective",         ← dominant mood of that day
//      weather: "cloudy",          ← weather metaphor for the mood
//      rippleColor: "#AB47BC",     ← hex color matching the mood
//      stoneCount: 2               ← how many conversations were completed that day
//    },
//    ...
//  ]
//
//  Days with no stones are omitted from the response.
//  Frontend should treat missing days as "no data" (clear/unknown).
//
//  Example:
//    Day with [sad, happy] → tie → most recent stone was "happy" → sunny
//    Day with [calm, calm, reflective] → calm wins → partly_cloudy
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { getDominantMood, getRippleColor, getWeather } from "@/lib/moodMapping";

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "weekly";

  // Determine how far back to look
  const now = new Date();
  let daysBack = 7;
  if (period === "daily") daysBack = 1;
  else if (period === "biweekly") daysBack = 14;
  else if (period === "monthly") daysBack = 30;

  const since = new Date(now);
  since.setDate(since.getDate() - daysBack);
  since.setHours(0, 0, 0, 0);

  const stones = await prisma.moodEntry.findMany({
    where: {
      userId: user.id,
      date: { gte: since },
    },
    select: {
      mood: true,
      date: true,
    },
    orderBy: { date: "asc" },
  });

  // Group stones by calendar day (YYYY-MM-DD)
  const byDay: Record<string, Array<{ mood: string; date: Date }>> = {};
  for (const stone of stones) {
    const day = stone.date.toISOString().slice(0, 10); // "2024-01-05"
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({ mood: stone.mood, date: stone.date });
  }

  // Build one forecast entry per day
  const forecast = Object.entries(byDay).map(([date, dayStones]) => {
    const dominantMood = getDominantMood(dayStones);
    return {
      date,
      mood: dominantMood,
      weather: getWeather(dominantMood),
      rippleColor: getRippleColor(dominantMood),
      stoneCount: dayStones.length,
    };
  });

  // Sort by date ascending so the frontend gets a chronological timeline
  forecast.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(forecast);
}
