// ============================================
//  POST /api/conversations/:id/complete
//
//  Called by the frontend when the user explicitly ends a conversation
//  (e.g. clicks "End reflection" or closes the chat).
//
//  This triggers the memory pipeline which runs asynchronously:
//    1. AI extracts summary, mood, tags, and memories from all messages
//    2. Embeddings are generated for each memory and stored in pgvector
//    3. Flower is updated: summary, mood, tags, growthStage=BLOOMING
//    4. MoodEntry (pond stone) is created from the detected mood
//    5. Conversation is marked as completed
//
//  The endpoint returns 202 Accepted immediately.
//  The pipeline runs in the background — the frontend should NOT wait for it.
//  Instead, the frontend can poll GET /api/flowers/:id after a short delay
//  to check if the flower has been updated (completedAt !== null).
//
//  Errors:
//    400 — conversation already completed (idempotency guard)
//    403 — conversation does not belong to this user
//    404 — conversation not found
//
//  Body: none required
//
//  Response: { message: "Pipeline started" }
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import { runMemoryPipeline } from "@/lib/memoryPipeline";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: conversationId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      flower: { select: { userId: true } },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Security: only the conversation owner can complete it
  if (conversation.flower.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Idempotency guard: don't run the pipeline twice
  if (conversation.isCompleted) {
    return NextResponse.json(
      { error: "Conversation is already completed" },
      { status: 400 }
    );
  }

  // Run the pipeline in the background — do not await.
  // The response is sent immediately with 202, and the pipeline
  // continues running. The flower in the DB will be updated
  // within a few seconds once OpenAI calls complete.
  runMemoryPipeline(conversationId).catch((err) => {
    console.error(`[complete] Pipeline error for ${conversationId}:`, err);
  });

  return NextResponse.json({ message: "Pipeline started" }, { status: 202 });
}
