// ============================================
//  memoryPipeline.ts
//
//  Runs after a conversation is marked as complete.
//  Called from: POST /api/conversations/:id/complete
//
//  This function is async and runs in the background —
//  the API route returns 202 immediately and this runs after.
//
//  Pipeline steps:
//    1. Load all messages from the conversation
//    2. Build a transcript string
//    3. Call OpenAI to extract:
//         - summary (short description of what was discussed)
//         - mood    (dominant emotional tone)
//         - tags    (topic keywords, e.g. ["career", "startup"])
//         - memories[] (structured insights with category)
//    4. Generate embeddings for each memory (text-embedding-3-small)
//    5. Save Memory records to DB (with vectors for semantic search)
//    6. Update Flower: summary, mood, tags, growthStage=BLOOMING, completedAt
//    7. Create MoodEntry (the pond stone) from the detected mood
//    8. Mark Conversation as completed
//
//  If any step fails, the error is logged but does not crash the app.
//  The flower will remain in its current state if the pipeline errors.
// ============================================

import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getRippleColor, getWeather, getIntensity, VALID_MOODS, DEFAULT_MOOD } from "@/lib/moodMapping";
import { GrowthStage } from "@prisma/client";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
//  computeGrowthStage
//
//  Determines the visual growth stage of the flower
//  based on how many messages have been exchanged.
//
//  Used by GET /api/flowers to show the current stage
//  before a conversation is completed.
//  At completion, the pipeline always sets BLOOMING.
// ============================================
export function computeGrowthStage(messageCount: number, isCompleted: boolean): GrowthStage {
  if (isCompleted) return GrowthStage.BLOOMING;
  if (messageCount >= 15) return GrowthStage.MATURE;
  if (messageCount >= 10) return GrowthStage.YOUNG;
  if (messageCount >= 5)  return GrowthStage.SPROUT;
  return GrowthStage.SEED;
}

// ============================================
//  ExtractionResult — shape of the JSON the AI returns
// ============================================
interface ExtractedMemory {
  content: string;
  category:
    | "goal"
    | "value"
    | "decision"
    | "lesson"
    | "concern"
    | "reflection"
    | "relationship"
    | "career"
    | "habit";
}

interface ExtractionResult {
  summary: string;
  mood: string;
  tags: string[];
  memories: ExtractedMemory[];
}

// ============================================
//  runMemoryPipeline
//
//  Main entry point. Called by the complete endpoint.
//  conversationId: the ID of the conversation to process.
// ============================================
export async function runMemoryPipeline(conversationId: string): Promise<void> {
  // --- Load conversation with all messages and linked flower/user ---
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      flower: {
        include: { user: true },
      },
    },
  });

  if (!conversation) {
    console.error(`[pipeline] Conversation ${conversationId} not found`);
    return;
  }

  if (conversation.messages.length === 0) {
    console.warn(`[pipeline] Conversation ${conversationId} has no messages, skipping`);
    return;
  }

  const { flower } = conversation;
  const userId = flower.userId;

  // --- Step 1: Build transcript ---
  // Format all messages into a readable string for the AI to analyze.
  const transcript = conversation.messages
    .map((m) => `${m.role === "user" ? "User" : "Companion"}: ${m.content}`)
    .join("\n");

  // --- Step 2: Extract summary, mood, tags, and memories via OpenAI ---
  let extracted: ExtractionResult;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a memory extraction system for a personal reflection app.
Analyze the following conversation and return a JSON object with:
{
  "summary": "2-3 sentence summary of what was discussed and how the user felt",
  "mood": "one of: happy, calm, sad, anxious, motivated, reflective, confused, angry, grateful",
  "tags": ["3-5 short topic keywords, e.g. career, family, startup"],
  "memories": [
    {
      "content": "a concise memory statement in first person (e.g. 'I want to change careers')",
      "category": "one of: goal, value, decision, lesson, concern, reflection, relationship, career, habit"
    }
  ]
}
Extract 2-5 meaningful memories. Only include memories that reveal something real about the user.
Respond only with the JSON object.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    extracted = JSON.parse(raw) as ExtractionResult;
  } catch (err) {
    console.error(`[pipeline] Memory extraction failed for ${conversationId}:`, err);
    // Still mark conversation as complete even if extraction fails
    await markCompleted(conversationId, flower.id, null);
    return;
  }

  // Validate mood — if AI returned something unexpected, fall back to default
  const mood = VALID_MOODS.includes(extracted.mood) ? extracted.mood : DEFAULT_MOOD;

  // --- Step 3: Generate embeddings and save Memory records ---
  // Each memory is embedded independently so they can be retrieved
  // via semantic search on future chat messages.
  const memoryInserts = extracted.memories ?? [];
  for (const mem of memoryInserts) {
    try {
      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: mem.content,
      });
      const vector = embeddingRes.data[0].embedding;
      const vectorStr = `[${vector.join(",")}]`;

      // Raw SQL insert because Prisma doesn't support vector type natively
      await prisma.$executeRaw`
        INSERT INTO "Memory" (id, "userId", "conversationId", content, type, embedding, "createdAt")
        VALUES (
          gen_random_uuid()::text,
          ${userId},
          ${conversationId},
          ${mem.content},
          ${mem.category}::"MemoryType",
          ${vectorStr}::vector,
          NOW()
        )
      `;
    } catch (err) {
      console.error(`[pipeline] Failed to embed memory "${mem.content}":`, err);
      // Continue with remaining memories even if one fails
    }
  }

  // --- Step 4: Update flower with extracted data ---
  await prisma.flower.update({
    where: { id: flower.id },
    data: {
      summary: extracted.summary,
      tags: extracted.tags ?? [],
      mood,
      growthStage: GrowthStage.BLOOMING,
      completedAt: new Date(),
    },
  });

  // --- Step 5: Create MoodEntry (the pond stone) ---
  // Only create if one doesn't already exist for this conversation.
  const existingEntry = await prisma.moodEntry.findUnique({
    where: { conversationId },
  });

  if (!existingEntry) {
    await prisma.moodEntry.create({
      data: {
        userId,
        conversationId,
        mood,
        rippleColor: getRippleColor(mood),
        weather: getWeather(mood),
        intensity: getIntensity(mood),
      },
    });
  }

  // --- Step 6: Mark conversation as completed ---
  await markCompleted(conversationId, flower.id, mood);

  console.log(`[pipeline] Completed for conversation ${conversationId}, mood: ${mood}`);
}

// Helper: marks the conversation as completed
async function markCompleted(
  conversationId: string,
  _flowerId: string,
  _mood: string | null
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isCompleted: true,
      completedAt: new Date(),
    },
  });
}
