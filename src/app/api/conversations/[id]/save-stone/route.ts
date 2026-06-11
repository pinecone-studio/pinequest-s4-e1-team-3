import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { getRippleColor, getWeatherByIntensity, getIntensity, VALID_MOODS, DEFAULT_MOOD } from "@/lib/moodMapping";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      flower: { select: { userId: true } },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.flower.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Don't create a second stone if one already exists for this conversation
  const existing = await prisma.moodEntry.findUnique({ where: { conversationId } });
  if (existing) return NextResponse.json({ id: existing.id });

  // Quick mood extraction from the conversation
  const transcript = conversation.messages
    .map((m) => `${m.role === "user" ? "User" : "Companion"}: ${m.content}`)
    .join("\n");

  let mood = DEFAULT_MOOD;
  let intensity = 3;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Analyze this conversation and return JSON:
{
  "mood": "one of: happy, calm, sad, anxious, motivated, reflective, confused, angry, grateful",
  "intensity": "integer 1-5 — how strongly the mood was felt"
}
Respond only with the JSON object.`,
        },
        { role: "user", content: transcript },
      ],
    });

    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    if (VALID_MOODS.includes(parsed.mood)) mood = parsed.mood;
    if (typeof parsed.intensity === "number" && parsed.intensity >= 1 && parsed.intensity <= 5) {
      intensity = Math.round(parsed.intensity);
    } else {
      intensity = getIntensity(mood);
    }
  } catch {
    intensity = getIntensity(mood);
  }

  const stone = await prisma.moodEntry.create({
    data: {
      userId: user.id,
      conversationId,
      mood,
      rippleColor: getRippleColor(mood),
      weather: getWeatherByIntensity(mood, intensity),
      intensity,
    },
  });

  return NextResponse.json({ id: stone.id });
}
