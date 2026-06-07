// ============================================
//  getUser.ts
//
//  Shared helper used by all API routes to get the
//  authenticated Prisma user from the Clerk session.
//
//  Why this exists:
//    Clerk gives us a clerkId (string) from auth().
//    All DB queries use the internal Prisma User.id (cuid).
//    This helper bridges the two so each route doesn't
//    repeat the same lookup logic.
//
//  Returns null if:
//    - The request is unauthenticated (no Clerk session)
//    - The user exists in Clerk but not yet in the DB
//      (e.g. signed up but /api/users POST hasn't been called yet)
//
//  Usage in a route:
//    const user = await getUser();
//    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// ============================================

import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getUser() {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // First API call after Clerk sign-up — create the DB row automatically.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  const name = clerkUser.firstName
    ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")
    : (clerkUser.username ?? undefined);

  return prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, name },
    update: {},
  });
}
