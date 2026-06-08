// ============================================
//  GET /api/conversations
//
//  Lists all conversations for the current user, newest first.
//  Used by the History panel in DeskChatPanel to let the user
//  jump back into any past reflection.
//
//  Response shape (array):
//  [
//    {
//      id: string,
//      isCompleted: boolean,
//      createdAt: string,
//      summary: string | null,      // from the flower, set after pipeline
//      mood: string | null,          // from the flower, set after pipeline
//      flower: {
//        id: string,
//        species: { key, name, color }
//      },
//      firstMessage: string | null  // first user message in the conversation
//    }
//  ]
// ============================================

import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { flower: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      isCompleted: true,
      createdAt: true,
      flower: {
        select: {
          id: true,
          summary: true,
          mood: true,
          species: {
            select: { key: true, name: true, color: true },
          },
        },
      },
      messages: {
        take: 1,
        where: { role: Role.user },
        orderBy: { createdAt: "asc" },
        select: { content: true },
      },
    },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      isCompleted: c.isCompleted,
      createdAt: c.createdAt,
      summary: c.flower.summary,
      mood: c.flower.mood,
      flower: {
        id: c.flower.id,
        species: c.flower.species,
      },
      firstMessage: c.messages[0]?.content ?? null,
    }))
  );
}
