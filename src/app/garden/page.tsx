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

import { redirect } from "next/navigation";
import { getUser } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";
import { GardenShell } from "@/components/garden/GardenShell";
import "./garden-shell.css";
import "./garden-panels.css";
import "./tutorial.css";

export default async function GardenPage() {
  // getUser() also lazily creates the User row, covering the OAuth path
  // where the sign-up form's POST /api/users never ran.
  const user = await getUser();
  if (!user) redirect("/sign-in");

  // Hard gate: must finish the onboarding EQ reflection first.
  const profile = await prisma.userEQProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile?.onboardingCompleted) redirect("/onboarding");

  return <GardenShell userName={user.name ?? ""} />;
}
