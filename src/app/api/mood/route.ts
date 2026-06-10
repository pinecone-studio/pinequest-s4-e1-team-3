// ============================================
//  /api/mood
//
//  GET → Returns all the user's stones (MoodEntry records) for the pond.
//  The pond UI renders each stone with its ripple color and intensity.
//
//  Stones are created automatically by the memory pipeline
//  (runMemoryPipeline in src/lib/memoryPipeline.ts) when a conversation
//  completes — the frontend does NOT call POST /api/mood directly.
//
//  One stone = one completed conversation. The conversationId uniqueness
//  constraint in the DB prevents duplicates.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

// ============================================
//  GET /api/mood
//
//  Returns all stones for the pond view, sorted newest first.
//
//  Optional query params:
//    ?limit=N   → only return last N stones (e.g. ?limit=30 for recent history)
//
//  Response shape:
//  [
//    {
//      id: string,
//      mood: string,         ← e.g. "reflective"
//      rippleColor: string,  ← hex, e.g. "#AB47BC" — pond ripple animation color
//      weather: string,      ← e.g. "cloudy" — used by Forecast feature
//      intensity: number,    ← 1–5, controls ripple size
//      date: Date,
//      conversationId: string | null
//    }
//  ]
//
//  Pond UI: renders all stones with their colors.
//  When user "throws" a stone, the animation color comes from rippleColor.
//
//  Forecast UI: uses the weather field (grouped by day) — see GET /api/forecast.
// ============================================
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  const stones = await prisma.moodEntry.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      mood: true,
      rippleColor: true,
      weather: true,
      intensity: true,
      date: true,
      conversationId: true,
      note: true,
    },
    orderBy: { date: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  return NextResponse.json(stones);
}


export async function DELETE(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.moodEntry.deleteMany({ where: { id, userId: user.id } });

  return new Response(null, { status: 204 });
}
