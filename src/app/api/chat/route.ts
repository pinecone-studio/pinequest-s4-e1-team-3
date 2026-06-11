// ============================================
//  POST /api/chat
//
//  TWO-STEP AI PIPELINE:
//    Step 1: GPT-5.4 writes the reply in English (all EQ logic).
//    Step 2: Egune translates it to natural spoken Mongolian.
//            Egune models are reasoning models that leak their thinking
//            into the output, so step 2 is NON-streaming: we request
//            thinking off (chat_template_kwargs), strip any leaked
//            reasoning, and return only the clean translation.
//
//  Memory system unchanged. Embeddings stay on OpenAI.
// ============================================

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";
import {
  MAX_OUTPUT_TOKENS_BY_FLOWER,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from "@/lib/flowerPrompts";
import {
  runMemoryCheckpoint,
  MEMORY_CHECKPOINT_INTERVAL,
} from "@/lib/memoryPipeline";

// Egune client (OpenAI SDK pointed at Egune's chat completions API).
const eguneClient = new OpenAI({
  baseURL: process.env.EGUNE_BASE_URL, // https://api.egune.com/v1
  apiKey: process.env.EGUNE_API_KEY,
});

// OpenAI client used ONLY for embeddings (memory retrieval). Do not remove.
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEMORY_SIMILARITY_THRESHOLD = 0.75;

const ENGLISH_OUTPUT_OVERRIDE = `

OUTPUT LANGUAGE OVERRIDE (highest priority):
Ignore all earlier instructions about writing in Mongolian. Write your reply in ENGLISH only. Your reply will be translated into Mongolian by another system afterwards. Keep everything else the same: stay short, warm, casual, follow the flower focus, use at most one emoji. Do not mention the translation step.`;

const TRANSLATION_MARKER = "Монгол орчуулга:";

// Remove leaked chain-of-thought from Egune's output.
function cleanTranslation(raw: string): string {
  let text = raw;

  // Qwen-style reasoning: everything before </think> is thinking.
  const thinkEnd = text.lastIndexOf("</think>");
  if (thinkEnd !== -1) text = text.slice(thinkEnd + "</think>".length);

  // If the model echoed our completion anchor, keep only what follows it.
  const markerIdx = text.lastIndexOf(TRANSLATION_MARKER);
  if (markerIdx !== -1) text = text.slice(markerIdx + TRANSLATION_MARKER.length);

  return text.trim();
}

export async function POST(req: NextRequest) {
  const { conversationId, message } = await req.json();

  if (!conversationId || !message) {
    return new Response("conversationId and message are required", {
      status: 400,
    });
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

  if (conversation.isCompleted) {
    return new Response("Conversation is already completed", { status: 400 });
  }

  const { flower } = conversation;
  const { species, user } = flower;

  const [, profileMemories, retrievedMemories] = await Promise.all([
    prisma.message.create({
      data: { conversationId, role: "user", content: message },
    }),

    prisma.memory.findMany({
      where: {
        userId: user.id,
        type: { in: ["goal", "value", "concern", "lesson"] },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),

    (async () => {
      try {
        const embeddingRes = await openaiClient.embeddings.create({
          model: "text-embedding-3-small",
          input: message,
        });
        const embeddingStr = "[" + embeddingRes.data[0].embedding.join(",") + "]";

        const similar = await prisma.$queryRaw<
          { content: string; score: number }[]
        >(
          Prisma.sql`
            SELECT content, 1 - (embedding <=> ${embeddingStr}::vector) AS score
            FROM "Memory"
            WHERE "userId" = ${user.id}
              AND embedding IS NOT NULL
              AND 1 - (embedding <=> ${embeddingStr}::vector) > ${MEMORY_SIMILARITY_THRESHOLD}
            ORDER BY score DESC
            LIMIT 3
          `,
        );

        return similar.map((m) => m.content).join("\n");
      } catch {
        return "";
      }
    })(),
  ]);

  const userProfile = profileMemories
    .map((m) => `[${m.type}] ${m.content}`)
    .join("\n");

  const systemPrompt = buildSystemPrompt({
    companionName: species.name,
    personality: species.systemPrompt,
    flowerKey: species.key,
    userName: user.name ?? "",
    userProfile,
    retrievedMemories,
    relationshipStage: user.relationshipStage,
  });

  const history = conversation.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const maxTokens =
    MAX_OUTPUT_TOKENS_BY_FLOWER[species.key] ?? DEFAULT_MAX_OUTPUT_TOKENS;

  // --- STEP 1: GPT-5.4 writes the reply in English ---
  const draft = await generateText({
    model: openai("gpt-5.4-2026-03-05"),
    system: systemPrompt + ENGLISH_OUTPUT_OVERRIDE,
    maxOutputTokens: maxTokens + 1024,
    providerOptions: {
      openai: { reasoningEffort: "low", textVerbosity: "low" },
    },
    messages: [...history, { role: "user", content: message }],
  });

  // Detect and strip [STONE_PROMPT] before translation so it never surfaces in text
  const hasStonePrompt = draft.text.includes("[STONE_PROMPT]");
  const draftForTranslation = draft.text.replace(/\[STONE_PROMPT\]/g, "").trim();

  // --- STEP 2: Egune translates to Mongolian (non-streaming) ---
  const completion = await eguneClient.chat.completions.create({
    model: "egune-nano",
    temperature: 0.1,
    max_tokens: maxTokens + 1024, // headroom in case thinking can't be disabled
    messages: [
      {
        role: "user",
        content: `Доорх англи текстийг ярианы монгол хэл рүү орчуул. "чи/чамд/чиний" хэрэглэ, "Та" гэхгүй. Утга, урт, emoji хэвээр. Бодол, тайлбар бичихгүй — ЗӨВХӨН орчуулгыг шууд бич.

Англи текст:
"""
${draftForTranslation}
"""

${TRANSLATION_MARKER}`,
      },
    ],
    // Standard vLLM/Qwen param to disable thinking — harmless if Egune ignores it.
    // @ts-expect-error Egune-specific parameter
    chat_template_kwargs: { enable_thinking: false },
  });

  const mongolianText = cleanTranslation(
    completion.choices[0]?.message?.content ?? "",
  );

  // Fallback: if cleaning somehow produced nothing, send the English draft
  // rather than a blank bubble.
  const finalText = mongolianText || draft.text;

  // Save the assistant message (the text the user will actually see).
  await prisma.message.create({
    data: { conversationId, role: "assistant", content: finalText },
  });

  // Periodic memory checkpoint (+2 for this turn's two new messages).
  const messageCount = conversation.messages.length + 2;
  if (
    messageCount - conversation.lastMemoryCheckpoint >=
    MEMORY_CHECKPOINT_INTERVAL
  ) {
    runMemoryCheckpoint(conversationId).catch((err) => {
      console.error(
        `[chat] Memory checkpoint failed for ${conversationId}:`,
        err,
      );
    });
  }

  return new Response(finalText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(hasStonePrompt ? { "X-Stone-Prompt": "true" } : {}),
    },
  });
}