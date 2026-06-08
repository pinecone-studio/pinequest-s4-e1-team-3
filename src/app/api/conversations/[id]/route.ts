// ============================================
//  GET /api/conversations/:id
//
//  Loads a conversation with its full message history.
//  Called by the chat page when the user clicks a flower to reopen it.
//
//  Returns everything the chat UI needs to render:
//    - all past messages (to show history)
//    - flower info (species name, color — for the chat header)
//    - isCompleted flag (to disable input if conversation is done)
//
//  Response shape:
//  {
//    id: string,
//    isCompleted: boolean,
//    createdAt: Date,
//    flower: {
//      id: string,
//      species: { key, name, color, svgPath }
//    },
//    messages: [
//      { id, role: "user"|"assistant", content, createdAt }
//    ]
//  }
//
//  Messages are ordered oldest → newest so the frontend
//  can render them top-to-bottom without reversing.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      flower: {
        include: {
          species: {
            select: { key: true, name: true, color: true, svgPath: true },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "asc" }, // oldest first for chat rendering
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Security: only the owner can read this conversation
  if (conversation.flower.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    id: conversation.id,
    isCompleted: conversation.isCompleted,
    createdAt: conversation.createdAt,
    flower: {
      id: conversation.flower.id,
      species: conversation.flower.species,
    },
    messages: conversation.messages,
  });
}

// DELETE /api/conversations/:id
// Deletes the flower (which cascades to the conversation, messages, memories).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    select: { flower: { select: { id: true, userId: true } } },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (conversation.flower.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.flower.delete({ where: { id: conversation.flower.id } });

  return NextResponse.json({ ok: true });
}
