import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Prisma } from "@prisma/client";
import { type NextRequest } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/buildSystemPrompt";

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const { flower } = conversation;
  const { species, user } = flower;

  await prisma.message.create({
    data: { conversationId, role: "user", content: message },
  });

  // Build user profile from long-term memories (goal, value, concern, lesson)
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

  // Retrieve semantically similar past memories via pgvector cosine search
  let retrievedMemories = "";
  try {
    const embeddingRes = await openaiClient.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const embeddingStr = `[${embeddingRes.data[0].embedding.join(",")}]`;

    const similar = await prisma.$queryRaw<{ content: string }[]>(
      Prisma.sql`
        SELECT content FROM "Memory"
        WHERE "userId" = ${user.id}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT 3
      `
    );
    retrievedMemories = similar.map((m) => m.content).join("\n");
  } catch {
    // Vector search failed — continue without retrieved memories
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
      await prisma.message.create({
        data: { conversationId, role: "assistant", content: text },
      });
    },
  });

  return result.toTextStreamResponse();
}
