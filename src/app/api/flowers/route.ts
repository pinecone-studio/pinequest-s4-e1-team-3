// ============================================
//  /api/flowers
//
//  GET  → Returns all of the authenticated user's flowers for the garden view.
//  POST → Creates a new flower + conversation (Workshop → chat entry point).
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { computeGrowthStage } from "@/lib/memoryPipeline";
import { getRandomGrassPosition } from "@/lib/gardenGrid";
import { getAblyRest, gardenChannel } from "@/lib/ably";

// ============================================
//  GET /api/flowers
//
//  Returns all flowers the user has planted in their garden.
//  Called when the garden page loads to render all flowers at their positions.
//
//  Each flower includes:
//    - position (posX, posY) for placement in the garden canvas
//    - species info (key, name, color, svgPath) for rendering the correct SVG
//    - growthStage — computed live from message count (before completion)
//                    or stored as BLOOMING (after completion)
//    - mood, summary, tags — only set after conversation completes
//    - conversationId — used by frontend to open the chat when flower is clicked
//
//  Response shape:
//  [
//    {
//      id, posX, posY, mood, growthStage, summary, tags,
//      plantedAt, completedAt,
//      species: { key, name, color, svgPath },
//      conversationId: string | null
//    }
//  ]
// ============================================
export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flowers = await prisma.flower.findMany({
    where: { userId: user.id },
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
    orderBy: { plantedAt: "asc" },
  });

  // Compute growthStage live from message count for incomplete conversations.
  // Completed flowers already have BLOOMING stored in the DB.
  const result = flowers.map((f) => {
    const messageCount = f.conversation?._count.messages ?? 0;
    const isCompleted = f.conversation?.isCompleted ?? false;
    const growthStage = isCompleted
      ? f.growthStage  // already BLOOMING, use stored value
      : computeGrowthStage(messageCount, false);

    return {
      id: f.id,
      posX: f.posX,
      posY: f.posY,
      mood: f.mood,
      growthStage,
      summary: f.summary,
      tags: f.tags,
      plantedAt: f.plantedAt,
      completedAt: f.completedAt,
      species: f.species,
      conversationId: f.conversation?.id ?? null,
    };
  });

  return NextResponse.json(result);
}

// ============================================
//  POST /api/flowers
//  Body: { speciesId: string }
//
//  Creates a new flower in the garden and its attached conversation.
//  This is the entry point from the Workshop — the user picks a species,
//  hits this endpoint, then is redirected to /chat/[conversationId].
//
//  Steps:
//    1. Validate the speciesId exists
//    2. Generate a random position in the garden (0–100 grid)
//    3. Create Flower + Conversation in a single transaction
//
//  Response shape:
//  {
//    id: string,          ← flower id
//    posX, posY,
//    growthStage: "SEED",
//    plantedAt,
//    species: { key, name, color, svgPath },
//    conversationId: string  ← frontend redirects to /chat/[conversationId]
//  }
// ============================================
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { speciesId } = body;

  if (!speciesId) {
    return NextResponse.json({ error: "speciesId is required" }, { status: 400 });
  }

  // Verify the species exists
  const species = await prisma.flowerSpecies.findUnique({
    where: { id: speciesId },
    select: { id: true, key: true, name: true, color: true, svgPath: true },
  });

  if (!species) {
    return NextResponse.json({ error: "Species not found" }, { status: 404 });
  }

  // Pick a grass tile from the garden grid, avoiding spots already occupied
  const occupied = await prisma.flower.findMany({
    where: { userId: user.id },
    select: { posX: true, posY: true },
  });
  const { posX, posY } = getRandomGrassPosition(occupied);

  // Create flower and conversation atomically so we never have a flower without a chat
  const flower = await prisma.flower.create({
    data: {
      userId: user.id,
      speciesId,
      posX,
      posY,
      conversation: {
        create: {}, // empty conversation — messages are added via /api/chat
      },
    },
    include: {
      conversation: { select: { id: true } },
      species: { select: { key: true, name: true, color: true, svgPath: true } },
    },
  });

  // Notify the client immediately so the bird messages dot appears
  // as soon as the flower is planted (no need to wait for pipeline).
  try {
    await getAblyRest().channels
      .get(gardenChannel(user.clerkId))
      .publish("garden-update", {
        type: "planted",
        flowerId: flower.id,
        flowerName: flower.species.name,
      });
  } catch {
    // Ably key not set or network error — non-fatal, continue
  }

  return NextResponse.json(
    {
      id: flower.id,
      posX: flower.posX,
      posY: flower.posY,
      growthStage: flower.growthStage,
      plantedAt: flower.plantedAt,
      species: flower.species,
      conversationId: flower.conversation!.id,
    },
    { status: 201 }
  );
}
