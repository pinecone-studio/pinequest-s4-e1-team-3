// ============================================
//  /garden  (page)
//
//  Entry point to the Garden experience. A server component so the
//  redirect-when-signed-out check happens before any client JS ships
//  — same pattern as the home page (src/app/page.tsx).
//
//  It fetches just the display name and hands off to <GardenShell>,
//  the client component that owns all interactive state. Garden data
//  itself (flowers, stones, memories, notes, species) is loaded
//  client-side by each panel via useFetchJson, so this page stays a
//  thin "who is allowed in, and what's their name" gate.
// ============================================

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GardenShell } from "@/components/garden/GardenShell";
import "./garden-shell.css";
import "./garden-panels.css";
import "./tutorial.css";

export default async function GardenPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { name: true },
  });

  return <GardenShell userName={user?.name ?? ""} />;
}
