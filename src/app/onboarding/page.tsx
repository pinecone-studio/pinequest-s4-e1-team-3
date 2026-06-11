// ============================================
//  /onboarding  (page)
//
//  Hard gate: a new user must complete the onboarding EQ reflection before
//  using the app. This server component checks the user's EQ profile and:
//    - not signed in        → /sign-in
//    - onboarding completed  → /garden (nothing to do here)
//    - otherwise            → render the onboarding flow
//  The matching redirect FROM /garden lives in src/app/garden/page.tsx.
// ============================================

import { redirect } from "next/navigation";
import { getUser } from "@/lib/getUser";
import { prisma } from "@/lib/prisma";
import { OnboardingFlow } from "@/components/eq/OnboardingFlow";

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.userEQProfile.findUnique({
    where: { userId: user.id },
  });
  if (profile?.onboardingCompleted) redirect("/garden");

  return <OnboardingFlow />;
}
