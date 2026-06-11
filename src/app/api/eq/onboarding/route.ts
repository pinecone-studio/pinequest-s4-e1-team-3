// ============================================
//  POST /api/eq/onboarding
//
//  Submits the one-time onboarding EQ test. Body: { answers: [{questionId,
//  selectedOption}] }. Scores are re-derived server-side from the question
//  bank (never trusted from the client), saved as an EQAssessment + answers,
//  and used to set the user's initial EQ profile (onboardingCompleted=true).
//  Logs the initial_eq_profile to the console for verification.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import {
  resolveAnswers,
  calculateOnboardingEQResult,
  AREA_KEY,
  type RawAnswer,
} from "@/lib/eqScoring";

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawAnswers: RawAnswer[] = Array.isArray(body?.answers) ? body.answers : [];
  const resolved = resolveAnswers(rawAnswers).filter((a) =>
    a.questionId.startsWith("onboarding_"),
  );

  if (resolved.length === 0) {
    return NextResponse.json({ error: "No valid answers submitted" }, { status: 400 });
  }

  const result = calculateOnboardingEQResult(resolved);

  const areaCols = {
    selfAwarenessScore: result.areaScores.SELF_AWARENESS,
    selfRegulationScore: result.areaScores.SELF_REGULATION,
    motivationScore: result.areaScores.MOTIVATION,
    empathyScore: result.areaScores.EMPATHY,
    socialSkillsScore: result.areaScores.SOCIAL_SKILLS,
  };

  await prisma.$transaction([
    prisma.eQAssessment.create({
      data: {
        userId: user.id,
        type: "onboarding",
        totalScore: result.totalScore,
        ...areaCols,
        strongestArea: result.strongestArea,
        supportArea: result.supportArea,
        answers: {
          create: resolved.map((a) => ({
            questionId: a.questionId,
            eqArea: a.eqArea,
            selectedOption: a.selectedOption,
            score: a.score,
          })),
        },
      },
    }),
    prisma.userEQProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        onboardingCompleted: true,
        initialTotalScore: result.totalScore,
        currentTotalScore: result.totalScore,
        ...areaCols,
        strongestArea: result.strongestArea,
        supportArea: result.supportArea,
      },
      update: {
        onboardingCompleted: true,
        initialTotalScore: result.totalScore,
        currentTotalScore: result.totalScore,
        ...areaCols,
        strongestArea: result.strongestArea,
        supportArea: result.supportArea,
      },
    }),
  ]);

  const profile = {
    userId: user.id,
    type: "initial_eq_profile" as const,
    totalScore: result.totalScore,
    areas: result.areas,
    strongestArea: AREA_KEY[result.strongestArea],
    supportArea: AREA_KEY[result.supportArea],
  };
  console.log("[eq] initial_eq_profile:", profile);

  return NextResponse.json({ ok: true, profile });
}
