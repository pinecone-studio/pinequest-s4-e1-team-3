// ============================================
//  GET /api/flowers/:id
//
//  Returns detailed information for a single flower.
//  Called when the user hovers over a flower in the garden
//  to show the tooltip/popover with conversation details.
//
//  Response shape:
//  {
//    id: string,
//    mood: string | null,
//    growthStage: GrowthStage,
//    summary: string | null,     ← shown in hover card
//    tags: string[],             ← topic chips in hover card
//    plantedAt: Date,            ← "Started: Jan 5"
//    completedAt: Date | null,   ← "Completed: Jan 6" or null
//    messageCount: number,       ← "12 messages exchanged"
//    species: {
//      key, name, color, svgPath
//    },
//    conversationId: string | null  ← click to open chat
//  }
//
//  This endpoint is intentionally separate from GET /api/flowers
//  because it includes messageCount (requires a count query)
//  which is too expensive to load for every flower in the garden.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { computeGrowthStage } from "@/lib/memoryPipeline";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const flower = await prisma.flower.findUnique({
    where: { id },
    include: {
      species: {
        select: { key: true, name: true, color: true, svgPath: true },
      },
      conversation: {
        select: {
          id: true,
          isCompleted: true,
          _count: { select: { messages: true } },
        },
      },
    },
  });

  if (!flower) {
    return NextResponse.json({ error: "Flower not found" }, { status: 404 });
  }

  // Security: only the owner can view their flower details
  if (flower.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messageCount = flower.conversation?._count.messages ?? 0;
  const isCompleted = flower.conversation?.isCompleted ?? false;
  const growthStage = isCompleted
    ? flower.growthStage
    : computeGrowthStage(messageCount, false);

  return NextResponse.json({
    id: flower.id,
    mood: flower.mood,
    growthStage,
    summary: flower.summary,
    tags: flower.tags,
    plantedAt: flower.plantedAt,
    completedAt: flower.completedAt,
    messageCount,
    species: flower.species,
    conversationId: flower.conversation?.id ?? null,
  });
}
