// ============================================
//  relationship.ts
//
//  Tracks how familiar Sage has become with a user — separate from
//  warmth (which never changes). The relationship score accumulates
//  from genuinely meaningful shared history, not raw message count:
//
//    - meaningful memory count   → how much Sage has learned about them
//    - completed reflections     → how many conversations they've seen through
//    - emotional depth           → range of moods they've shared
//    - active days               → whether they keep coming back over time
//
//  The score maps to a RelationshipStage (SPROUT → BLOOMING → ROOTED),
//  which buildSystemPrompt() weaves into the system prompt as a
//  dynamically-appended behavior block.
//
//  Recomputed by updateRelationshipProgress(), called from
//  runMemoryPipeline and runMemoryCheckpoint in memoryPipeline.ts —
//  i.e. whenever new shared history is actually banked.
// ============================================

import { RelationshipStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Suggested thresholds from the design: SPROUT 0-30, BLOOMING 31-100, ROOTED 100+.
const SPROUT_MAX = 30;
const BLOOMING_MAX = 100;

export function stageFromScore(score: number): RelationshipStage {
  if (score <= SPROUT_MAX) return RelationshipStage.SPROUT;
  if (score <= BLOOMING_MAX) return RelationshipStage.BLOOMING;
  return RelationshipStage.ROOTED;
}

// ============================================
//  computeRelationshipScore
//
//  Each factor is capped and weighted so that a handful of memories
//  plus a few return visits crosses into BLOOMING, while sustained
//  history across many days — with completed reflections and real
//  emotional range — is what it takes to reach ROOTED.
//  Max attainable ≈ 120, comfortably past the ROOTED threshold.
// ============================================
export async function computeRelationshipScore(userId: string): Promise<number> {
  const [memoryCount, completedReflections, distinctMoods, activeDaysResult] = await Promise.all([
    prisma.memory.count({ where: { userId } }),
    prisma.conversation.count({ where: { flower: { userId }, isCompleted: true } }),
    prisma.moodEntry.findMany({
      where: { userId },
      distinct: ["mood"],
      select: { mood: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT DATE("Message"."createdAt")) AS count
      FROM "Message"
      JOIN "Conversation" ON "Conversation"."id" = "Message"."conversationId"
      JOIN "Flower" ON "Flower"."id" = "Conversation"."flowerId"
      WHERE "Flower"."userId" = ${userId} AND "Message"."role" = 'user'
    `,
  ]);

  const activeDays = Number(activeDaysResult[0]?.count ?? 0);

  const memoryPoints = Math.min(memoryCount * 2, 40);
  const activeDayPoints = Math.min(activeDays * 3, 30);
  const reflectionPoints = Math.min(completedReflections * 6, 30);
  const depthPoints = Math.min(distinctMoods.length * 5, 20);

  return memoryPoints + activeDayPoints + reflectionPoints + depthPoints;
}

// ============================================
//  updateRelationshipProgress
//
//  Recomputes the score, derives the stage, and persists both on the
//  user profile. Callers should catch/log — a failure here must never
//  block memory saving or conversation completion.
// ============================================
export async function updateRelationshipProgress(userId: string): Promise<void> {
  const score = await computeRelationshipScore(userId);
  const stage = stageFromScore(score);

  await prisma.user.update({
    where: { id: userId },
    data: { relationshipScore: score, relationshipStage: stage },
  });
}
