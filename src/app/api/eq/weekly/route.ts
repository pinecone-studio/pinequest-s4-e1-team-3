// ============================================
//  /api/eq/weekly
//
//  GET  → button state for the Reflection panel: whether the weekly test is
//         available, and if not, how many days until it unlocks. Derived
//         from the latest type=weekly EQAssessment (+7 days). No separate
//         timer column — the latest weekly row is the single source of truth.
//
//  POST → submit the 10-question weekly reflection. Re-derives scores
//         server-side, compares to the previous weekly for changeFromLastWeek,
//         saves the assessment, updates the user's current EQ profile, and
//         logs both weekly_eq_reflection and combined_eq_profile.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import {
  resolveAnswers,
  calculateWeeklyEQResult,
  assessmentAreaScores,
  AREA_KEY,
  type RawAnswer,
} from "@/lib/eqScoring";
import { loadAndLogCombinedEQProfile } from "@/lib/eqSignals";

async function latestWeekly(userId: string) {
  return prisma.eQAssessment.findFirst({
    where: { userId, type: "weekly" },
    orderBy: { completedAt: "desc" },
  });
}

async function latestOnboarding(userId: string) {
  return prisma.eQAssessment.findFirst({
    where: { userId, type: "onboarding" },
    orderBy: { completedAt: "desc" },
  });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [lastWeekly, onboarding, weeklyCount] = await Promise.all([
    latestWeekly(user.id),
    latestOnboarding(user.id),
    prisma.eQAssessment.count({ where: { userId: user.id, type: "weekly" } }),
  ]);

  // Onboarding must be complete before any weekly becomes available
  if (!onboarding) {
    return NextResponse.json({
      hasEverTaken: false,
      available: false,
      daysUntilNext: null,
      lastTakenAt: null,
      setIndex: 0,
    });
  }

  // Rotation: which set to show next. A set repeats only every 3 reflections.
  const setIndex = weeklyCount % 3;

  // The reflection is always available once onboarding is done — there's no
  // 7-day lock, so the check-in bird stays present and the test can be taken
  // any time. (Kept `daysUntilNext` in the shape for backwards compatibility.)
  return NextResponse.json({
    hasEverTaken: !!lastWeekly,
    available: true,
    daysUntilNext: 0,
    lastTakenAt: lastWeekly?.completedAt.toISOString() ?? null,
    setIndex,
  });
}

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // No time lock — the reflection can be submitted any time. We still load the
  // previous one to compute week-over-week change.
  const previous = await latestWeekly(user.id);

  const body = await req.json().catch(() => null);
  const rawAnswers: RawAnswer[] = Array.isArray(body?.answers) ? body.answers : [];
  const resolved = resolveAnswers(rawAnswers).filter((a) =>
    a.questionId.startsWith("weekly_"),
  );

  if (resolved.length === 0) {
    return NextResponse.json({ error: "No valid answers submitted" }, { status: 400 });
  }

  const previousScores = previous ? assessmentAreaScores(previous) : null;
  const result = calculateWeeklyEQResult(resolved, previousScores);

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
        type: "weekly",
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
        currentTotalScore: result.totalScore,
        ...areaCols,
        strongestArea: result.strongestArea,
        supportArea: result.supportArea,
      },
      update: {
        currentTotalScore: result.totalScore,
        ...areaCols,
        strongestArea: result.strongestArea,
        supportArea: result.supportArea,
      },
    }),
  ]);

  const weekly = {
    userId: user.id,
    type: "weekly_eq_reflection" as const,
    weekStartDate: new Date().toISOString().slice(0, 10),
    totalScore: result.totalScore,
    maxScore: result.maxScore,
    areas: result.areas,
    suggestedFocusForNextWeek: result.suggestedFocusForNextWeek
      ? AREA_KEY[result.suggestedFocusForNextWeek]
      : null,
  };
  console.log("[eq] weekly_eq_reflection:", weekly);

  // Merge with onboarding + conversation signals and log the combined view.
  await loadAndLogCombinedEQProfile(user.id, "eq");

  return NextResponse.json({ ok: true, weekly });
}
