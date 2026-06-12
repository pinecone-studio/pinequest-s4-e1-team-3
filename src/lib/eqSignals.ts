// ============================================
//  eqSignals.ts
//
//  Bridges the existing conversation-extraction output
//  (FullExtractionResult from src/lib/extractionPrompt.ts) into stored
//  ConversationEQSignal rows. NO new AI call — the chat pipeline already
//  extracts everything we need; this just maps + persists it.
//
//  Called from runMemoryPipeline in src/lib/memoryPipeline.ts.
// ============================================

import type { EQArea } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EQSkill, FullExtractionResult } from "@/lib/extractionPrompt";
import { calculateCombinedEQProfile } from "@/lib/eqScoring";

// The mapped, ready-to-store signal (matches the ConversationEQSignal model).
export interface MappedEQSignal {
  userId: string;
  conversationId: string;
  eqArea: EQArea;
  emotions: string[];
  skillsPracticed: EQSkill[];
  pattern: string | null;
  confidence: number;
  gentleInsight: string | null;
  suggestedSupport: string | null;
}

// Map the already-extracted conversation result into a signal.
// Returns null when there's nothing worth recording (no EQ domain detected).
export function extractEQSignalsFromConversation(
  extracted: FullExtractionResult,
  ids: { userId: string; conversationId: string },
): MappedEQSignal | null {
  if (!extracted.eqDomain) return null;

  const emotions = [extracted.mainEmotion, extracted.secondaryEmotion].filter(
    (e): e is string => !!e,
  );

  return {
    userId: ids.userId,
    conversationId: ids.conversationId,
    // EQDomain and EQArea share the same string values by design.
    eqArea: extracted.eqDomain as unknown as EQArea,
    emotions,
    skillsPracticed: extracted.skillsPracticed,
    pattern: extracted.thoughtPattern ?? extracted.insight,
    confidence: extracted.confidence,
    gentleInsight: extracted.insight,
    suggestedSupport:
      extracted.nextStep ?? extracted.suggestedPracticeTask.description,
  };
}

// Persist the mapped signal (if any) and console.log it in the spec's
// conversation_eq_signal shape. Returns the created signal or null.
export async function persistConversationEQSignal(
  extracted: FullExtractionResult,
  ids: { userId: string; conversationId: string },
  logTag = "pipeline",
): Promise<MappedEQSignal | null> {
  const signal = extractEQSignalsFromConversation(extracted, ids);
  if (!signal) return null;

  try {
    await prisma.conversationEQSignal.create({
      data: {
        userId: signal.userId,
        conversationId: signal.conversationId,
        eqArea: signal.eqArea,
        emotions: signal.emotions,
        skillsPracticed: signal.skillsPracticed,
        pattern: signal.pattern,
        confidence: signal.confidence,
        gentleInsight: signal.gentleInsight,
        suggestedSupport: signal.suggestedSupport,
      },
    });
  } catch (err) {
    console.error(`[${logTag}] Failed to save EQ signal for ${ids.conversationId}:`, err);
    return null;
  }

  console.log(`[${logTag}] conversation_eq_signal:`, {
    type: "conversation_eq_signal",
    conversationId: signal.conversationId,
    userId: signal.userId,
    signals: [
      {
        eqArea: signal.eqArea,
        emotions: signal.emotions,
        skillsPracticed: signal.skillsPracticed,
        pattern: signal.pattern,
        confidence: signal.confidence,
        gentleInsight: signal.gentleInsight,
        suggestedSupport: signal.suggestedSupport,
      },
    ],
  });

  return signal;
}

// Load the three EQ sources for a user, compute the combined profile, and
// console.log it. Called after a conversation's signal is persisted and
// after a weekly reflection is submitted.
export async function loadAndLogCombinedEQProfile(
  userId: string,
  logTag = "pipeline",
) {
  const [onboarding, latestWeekly, signals, tasks] = await Promise.all([
    prisma.eQAssessment.findFirst({
      where: { userId, type: "onboarding" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.eQAssessment.findFirst({
      where: { userId, type: "weekly" },
      orderBy: { completedAt: "desc" },
    }),
    prisma.conversationEQSignal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.task.findMany({
      where: { userId },
      select: { flowerKey: true, isCompleted: true },
    }),
  ]);

  const combined = calculateCombinedEQProfile({
    userId,
    onboarding,
    latestWeekly,
    signals: signals.map((s) => ({
      ...s,
      skillsPracticed: s.skillsPracticed as EQSkill[],
    })),
    tasks,
  });
  console.log(`[${logTag}] combined_eq_profile:`, combined);
  return combined;
}
