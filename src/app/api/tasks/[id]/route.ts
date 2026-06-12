import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { isCompleted } = (await req.json()) as { isCompleted: boolean };

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.task.update({
    where: { id },
    data: {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
