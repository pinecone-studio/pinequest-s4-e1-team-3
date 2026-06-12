// ============================================
//  GET /api/bird-messages
//
//  Aggregates real garden activity into a prioritised list of
//  "bird messages" — the in-app notification panel.
//
//  Five message types, each generated from a different data source:
//    milestone  → BLOOMING flowers completed in the last 7 days
//    memory     → newest memories extracted from conversations
//    mood       → dominant mood summary for the current week
//    insight    → most common memory type across all conversations
//    nudge      → gentle reminder if no conversation in 3+ days
//
//  Messages are sorted by createdAt descending (newest first).
//  Returns [] if the user has no activity yet — frontend falls back
//  to preview fixtures in that case.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { SPECIES_NAME_MN } from "@/components/garden/speciesText";

type BirdMessage = {
  id: string;
  type: "milestone" | "memory" | "mood" | "insight" | "nudge";
  icon: string;
  title: string;
  body: string;
  createdAt: string;
  color: string;
};

const MOOD_MN: Record<string, string> = {
  calm: "тайван",
  happy: "баяр баясгалантай",
  grateful: "талархалтай",
  sad: "гунигтай",
  reflective: "эргэцүүлэнгэ",
  anxious: "түгшүүртэй",
  motivated: "урам зоригтой",
  confused: "эргэлзээтэй",
  angry: "ууртай",
};

export async function GET() {
  try {
    return await buildMessages();
  } catch (err) {
    console.error("[bird-messages] unhandled error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function buildMessages() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const messages: BirdMessage[] = [];

  // Debug: log what we find so you can check the terminal
  const [dbgBloom, dbgMem, dbgMood] = await Promise.all([
    prisma.flower.count({ where: { userId: user.id } }),
    prisma.memory.count({ where: { userId: user.id } }),
    prisma.moodEntry.count({ where: { userId: user.id } }),
  ]);
  const dbgBlooming = await prisma.flower.count({ where: { userId: user.id, growthStage: "BLOOMING" } });
  console.log(`[bird-messages] userId=${user.id} flowers=${dbgBloom} blooming=${dbgBlooming} memories=${dbgMem} moodEntries=${dbgMood}`);

  // ── 1. All flowers — planted or bloomed ──────────────────────────────
  // Show a card for every flower, whether it's still growing or fully bloomed.
  // "planted" flowers get a "has been planted" message; BLOOMING ones get
  // the bloom milestone with memory count.
  const allFlowers = await prisma.flower.findMany({
    where: { userId: user.id },
    include: {
      species: { select: { name: true, color: true, key: true } },
      conversation: {
        select: { _count: { select: { memories: true } } },
      },
    },
    orderBy: { plantedAt: "desc" },
    take: 5,
  });

  for (const flower of allFlowers) {
    const memCount = flower.conversation?._count.memories ?? 0;
    const flowerName = SPECIES_NAME_MN[flower.species.key] ?? flower.species.name;
    if (flower.growthStage === "BLOOMING") {
      messages.push({
        id: `bloom-${flower.id}`,
        type: "milestone",
        icon: "🌸",
        title: `Таны ${flowerName} дэлгэрлээ`,
        body: `Таны ${flowerName} бүрэн дэлгэрлээ${
          memCount > 0
            ? ` бөгөөд таны мод дээр ${memCount} дурсамж тээж байна`
            : ""
        }.`,
        createdAt: (flower.completedAt ?? flower.plantedAt).toISOString(),
        color: flower.species.color,
      });
    } else {
      messages.push({
        id: `planted-${flower.id}`,
        type: "milestone",
        icon: "🌱",
        title: `Таны ${flowerName} таригдлаа`,
        body: `Таны ${flowerName} ургаж байна — дэлгэрэхэд нь туслахын тулд үргэлжлүүлэн ярилцаарай.`,
        createdAt: flower.plantedAt.toISOString(),
        color: flower.species.color,
      });
    }
  }

  // ── 2. Recent memory arrivals (last 7 days) ────────────────────────────
  const recentMemories = await prisma.memory.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: sevenDaysAgo },
    },
    include: {
      conversation: {
        include: {
          flower: { include: { species: { select: { color: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  for (const memory of recentMemories) {
    const color = memory.conversation.flower.species.color;
    const excerpt =
      memory.content.length > 90
        ? memory.content.slice(0, 90) + "…"
        : memory.content;
    messages.push({
      id: `memory-${memory.id}`,
      type: "memory",
      icon: "🍃",
      title: "Таны мод дээр дурсамж иржээ",
      body: `«${excerpt}»`,
      createdAt: memory.createdAt.toISOString(),
      color,
    });
  }

  // ── 3. Weekly mood recap ───────────────────────────────────────────────
  const moodEntries = await prisma.moodEntry.findMany({
    where: { userId: user.id, date: { gte: sevenDaysAgo } },
    select: { mood: true },
  });

  if (moodEntries.length > 0) {
    const counts: Record<string, number> = {};
    for (const e of moodEntries) counts[e.mood] = (counts[e.mood] ?? 0) + 1;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    messages.push({
      id: "mood-recap",
      type: "mood",
      icon: "🌤️",
      title: "Цэцэрлэг дэх таны долоо хоног",
      body: `Та энэ долоо хоногт ${moodEntries.length} яриа өрнүүлжээ. Таны цэцэрлэг ихэвчлэн ${MOOD_MN[dominant] ?? dominant} байлаа.`,
      createdAt: now.toISOString(),
      color: "#d8c27a",
    });
  }

  // ── 4. AI pattern insight (most common memory type overall) ───────────
  const allMemoryTypes = await prisma.memory.findMany({
    where: { userId: user.id },
    select: { type: true },
  });

  if (allMemoryTypes.length >= 3) {
    const typeCounts: Record<string, number> = {};
    for (const m of allMemoryTypes)
      typeCounts[m.type] = (typeCounts[m.type] ?? 0) + 1;
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
    messages.push({
      id: "insight",
      type: "insight",
      icon: "✨",
      title: "Нэгэн хэв маяг ажиглагдлаа",
      body: `Таны яриа ихэвчлэн ${topType} төрлийн санаа агуулдаг. Таны цэцэрлэг чамайг чимээгүйхэн таньж байна.`,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      color: "#cf8aa0",
    });
  }

  // ── 5. Gentle nudge if no conversation in 3+ days ─────────────────────
  const lastConversation = await prisma.conversation.findFirst({
    where: { flower: { userId: user.id } },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  if (lastConversation) {
    const daysSince = Math.floor(
      (now.getTime() - lastConversation.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince >= 3) {
      messages.push({
        id: "nudge",
        type: "nudge",
        icon: "🌱",
        title: "Таны цэцэрлэг чамайг санаж байна",
        body: `Сүүлийн ярианаас хойш ${daysSince} хоног өнгөрлөө. Таны цэцэгс чимээгүйхэн хүлээж байна.`,
        createdAt: lastConversation.updatedAt.toISOString(),
        color: "#6b7c5a",
      });
    }
  }

  messages.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json(messages);
}
