// ============================================
//  /api/notes
//
//  GET  → List all notes for the authenticated user.
//  POST → Create a new note.
//
//  Notes appear on the Botanist's Desk beside the chat.
//  They can be standalone or linked to a specific conversation.
//
//  Notes also feed into the AI memory system — the semantic
//  search in /api/chat will eventually retrieve notes as additional
//  context (same as Memory records). This is handled separately;
//  these routes just manage CRUD.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

// ============================================
//  GET /api/notes
//
//  Returns all non-archived notes by default.
//  Use ?archived=true to get archived notes (desk drawer).
//  Use ?conversationId=xxx to get notes linked to a specific chat.
//  Use ?search=keyword for text search across title and body.
//
//  Response shape:
//  [
//    {
//      id, title, body, archived,
//      createdAt, updatedAt,
//      conversationId: string | null
//    }
//  ]
// ============================================
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const notes = await prisma.note.findMany({
    where: {
      userId: user.id,
      archived,
      ...(conversationId ? { conversationId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { body: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      body: true,
      archived: true,
      createdAt: true,
      updatedAt: true,
      conversationId: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(notes);
}

// ============================================
//  POST /api/notes
//  Body: { title: string, body: string, conversationId?: string }
//
//  Creates a new note on the Botanist's Desk.
//  conversationId is optional — link it to a chat or leave standalone.
//
//  Response: the created note object.
// ============================================
export async function POST(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, body: noteBody, conversationId } = body;

  if (!title || !noteBody) {
    return NextResponse.json(
      { error: "title and body are required" },
      { status: 400 }
    );
  }

  // If a conversationId is provided, verify it belongs to this user
  if (conversationId) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { flower: { select: { userId: true } } },
    });
    if (!conversation || conversation.flower.userId !== user.id) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
  }

  const note = await prisma.note.create({
    data: {
      userId: user.id,
      title,
      body: noteBody,
      ...(conversationId ? { conversationId } : {}),
    },
  });

  return NextResponse.json(note, { status: 201 });
}
