// ============================================
//  /api/notes/:id
//
//  PUT    → Update a note's title, body, or archived state.
//  DELETE → Permanently delete a note.
//
//  Both operations require the note to belong to the authenticated user.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

// ============================================
//  PUT /api/notes/:id
//  Body: { title?: string, body?: string, archived?: boolean }
//
//  Partial update — only fields provided in the body are changed.
//  Use archived: true to move a note to the desk drawer.
//  Use archived: false to restore it back to the desk.
//
//  Response: the updated note object.
// ============================================
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { title, body: noteBody, archived } = body;

  const existing = await prisma.note.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only update fields that were explicitly provided
  const updated = await prisma.note.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(noteBody !== undefined ? { body: noteBody } : {}),
      ...(archived !== undefined ? { archived } : {}),
    },
  });

  return NextResponse.json(updated);
}

// ============================================
//  DELETE /api/notes/:id
//
//  Permanently deletes the note.
//  This is irreversible — if soft-delete is needed, use PUT with archived: true instead.
//
//  Response: 204 No Content on success.
// ============================================
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.note.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  if (existing.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.note.delete({ where: { id } });

  return new Response(null, { status: 204 });
}
