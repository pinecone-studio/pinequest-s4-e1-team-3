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

// OpenAI client used ONLY for embeddings (memory retrieval). Do not remove.
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEMORY_SIMILARITY_THRESHOLD = 0.75;

const ENGLISH_OUTPUT_OVERRIDE = `

OUTPUT LANGUAGE OVERRIDE (highest priority):
Ignore all earlier instructions about writing in Mongolian. Write your reply in ENGLISH only. Your reply will be translated into Mongolian by another system afterwards. Keep everything else the same: stay short, warm, casual, follow the flower focus, use at most one emoji. Do not mention the translation step.`;

// GPT-5.4 translates the English draft to natural spoken Mongolian.
const GPT_TRANSLATION_SYSTEM = `Чи англи текстийг ярианы монгол руу орчуулна.

Зорилго:
- Үгчлэхгүй. Монгол хүн өдөр тутмын яриандаа хэлэхээр байгалийн болго.
- Гэхдээ эх текстийн утга, мэдрэмж, өнгө аясыг яг хадгал.

Дүрэм:
- "чи/чамд/чиний" хэрэглэ, "Та/танд/таны" биш.
- Эх текстэд байхгүй шинэ санаа, зөвлөгөө, дүгнэлт, мэдрэмж бүү нэм. Бүү драмжуул.
- Өгүүлбэрийн тоог эхтэй ойролцоо байлга. Эхэд emoji байхгүй бол бүү нэм.
- Сонголтын асуулт ("more like X, or more like Y") бол "эсвэл" хэрэглэж сонгуул. "X ч, Y ч" гэж хоёуланг нь баталж болохгүй.
- Зөөлрүүлэгч бөөмс (даа/л доо/юм/шиг) нэг өгүүлбэрт хэт олон давхарлаж болохгүй. "байна уу даа" гэх давхар хэлбэрээс зайлсхий.

Жишээ:
EN: That sounds really uncomfortable. Does it feel more like fear, or more like shame?
MN: Ёстой эвгүй л юм байна. Айдас шиг үү, эсвэл ичмээр санагдаж байна уу?

EN: Ah... after saying that, it probably feels heavy inside. There may still be a way to fix it.
MN: Өө... тэгж хэлснийхээ дараа дотор чинь хүндхэн байгаа байх. Гэсэн ч засах арга бий.

Зөвхөн монгол орчуулгыг бич. Тайлбар, quotation mark бүү бич.`;

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
        const embeddingStr =
          "[" + embeddingRes.data[0].embedding.join(",") + "]";

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

  console.log("[chat] STEP 1 — GPT-5.4 draft (English):", draft.text);
  // Detect and strip [STONE_PROMPT] before translation so it never surfaces in text
  const hasStonePrompt = draft.text.includes("[STONE_PROMPT]");
  const draftForTranslation = draft.text
    .replace(/\[STONE_PROMPT\]/g, "")
    .trim();

  // --- STEP 2: GPT-5.4 translates the English draft to Mongolian ---
  // (Egune and the direct-Mongolian approach were both dropped — direct
  // generation produced inaccurate replies; translate-from-English is the
  // validated path.)
  const translateGen = await generateText({
    model: openai("gpt-5.4-2026-03-05"),
    system: GPT_TRANSLATION_SYSTEM,
    prompt: draftForTranslation,
    maxOutputTokens: maxTokens + 256,
    providerOptions: {
      openai: { reasoningEffort: "low", textVerbosity: "low" },
    },
  });

  const mongolianText = translateGen.text.trim();
  console.log("[chat] STEP 2 — GPT translation (Mongolian):", mongolianText);

  // Fallback to the English draft if translation somehow came back empty.
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
