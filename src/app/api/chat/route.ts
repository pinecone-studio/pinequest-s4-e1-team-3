// ============================================
//  POST /api/chat
//
//  Streaming chat endpoint. Called on every message the user sends.
//  Body: { conversationId: string, message: string }
//
//  How the AI gets context:
//
//  Two memory sources are injected into every request:
//
//  1. PROFILE MEMORIES (always present)
//     Goal, value, concern, and lesson memories from all past conversations.
//     These describe who the user IS — their recurring patterns and traits.
//     The most recent 12 are loaded. They don't need to be relevant to the
//     current message; they're background knowledge the AI always has.
//
//  2. SEMANTIC MEMORIES (relevance-based)
//     The current message is embedded with text-embedding-3-small.
//     pgvector finds the top 3 memories with cosine similarity > 0.75.
//     The 0.75 threshold ensures only genuinely related past thoughts
//     are injected — a greeting like "hi" won't surface random memories.
//     If no memories pass the threshold, this section is empty.
//
//  Both sources are passed to buildSystemPrompt() which weaves them
//  into the AI's system prompt naturally (not recited, just known).
//
//  Streaming: uses Vercel AI SDK streamText + toTextStreamResponse().
//  The frontend reads the stream incrementally to render text as it arrives.
//
//  Message persistence:
//    - User message is saved to DB before the AI call
//    - Assistant response is saved in the onFinish callback after streaming ends
// ============================================

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Only inject memories with cosine similarity above this threshold.
// Cosine similarity ranges from 0 (unrelated) to 1 (identical).
// 0.75 means the memory must be strongly related to the current message.
const MEMORY_SIMILARITY_THRESHOLD = 0.75;

export async function POST(req: NextRequest) {
  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return new Response("conversationId and message are required", { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      flower: {
        include: {
          species: true,
          user: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  // Block messages on completed conversations
  if (conversation.isCompleted) {
    return new Response("Conversation is already completed", { status: 400 });
  }

  const { flower } = conversation;
  const { species, user } = flower;

  // Save the user's message immediately before making the AI call
  await prisma.message.create({
    data: { conversationId, role: "user", content: message },
  });

  // --- Memory Source 1: Profile memories (always injected) ---
  // Load the most recent goals, values, concerns, and lessons across all conversations.
  // These give the AI a stable "who this person is" context on every message.
  const profileMemories = await prisma.memory.findMany({
    where: {
      userId: user.id,
      type: { in: ["goal", "value", "concern", "lesson"] },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const userProfile = profileMemories
    .map((m) => `[${m.type}] ${m.content}`)
    .join("\n");

  // --- Memory Source 2: Semantic retrieval (relevance-based) ---
  // Embed the current message and find past memories that are semantically close.
  // Only memories above MEMORY_SIMILARITY_THRESHOLD are injected.
  // This prevents irrelevant memories from confusing the AI on simple messages.
  let retrievedMemories = "";
  try {
    const embeddingRes = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const embeddingStr = `[${embeddingRes.data[0].embedding.join(",")}]`;

    // pgvector cosine similarity: 1 - (embedding <=> query) gives similarity score
    // We filter to only return memories above the threshold
    const similar = await prisma.$queryRaw<{ content: string; score: number }[]>(
      Prisma.sql`
        SELECT content, 1 - (embedding <=> ${embeddingStr}::vector) AS score
        FROM "Memory"
        WHERE "userId" = ${user.id}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${embeddingStr}::vector) > ${MEMORY_SIMILARITY_THRESHOLD}
        ORDER BY score DESC
        LIMIT 3
      `
    );

    retrievedMemories = similar.map((m) => m.content).join("\n");
  } catch {
    // Vector search failed — continue without retrieved memories.
    // This can happen if no memories exist yet (new user) or pgvector is unavailable.
  }

  const systemPrompt = buildSystemPrompt({
    companionName: species.name,
    personality: species.systemPrompt,
    userName: user.name ?? "",
    userProfile,
    retrievedMemories,
  });

  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: [...history, { role: "user", content: message }],
    async onFinish({ text }) {
      // Save the AI's response after the full stream completes
      await prisma.message.create({
        data: { conversationId, role: "assistant", content: text },
      });
    },
  });

  return result.toTextStreamResponse();
}
