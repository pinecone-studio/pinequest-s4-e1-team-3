import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, birthday, gender, name } = await req.json();

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: { birthday, gender },
    create: { clerkId: userId, email, name, birthday, gender },
  });

  return NextResponse.json(user);
}
