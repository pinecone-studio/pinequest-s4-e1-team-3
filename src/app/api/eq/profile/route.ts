// ============================================
//  GET /api/eq/profile
//
//  Returns the user's current EQ snapshot for the Check-in dashboard,
//  normalized to percentages so the bars are comparable regardless of which
//  test last updated the profile (onboarding = 16/area, weekly = 8/area).
//  Source of truth is the most recent EQAssessment (it carries the type, and
//  therefore the correct max), not the UserEQProfile columns which don't
//  record which test produced them.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";
import {
  EQ_AREAS,
  AREA_KEY,
  getAreaLevel,
  assessmentAreaScores,
} from "@/lib/eqScoring";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [latest, recentWeeklies] = await Promise.all([
    prisma.eQAssessment.findFirst({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
    }),
    prisma.eQAssessment.findMany({
      where: { userId: user.id, type: "weekly" },
      orderBy: { completedAt: "desc" },
      take: 2,
    }),
  ]);

  if (!latest) return NextResponse.json({ hasProfile: false });

  // Trend = direction vs the previous weekly (same 8-pt scale). What matters
  // for an individual is their own movement, not an absolute score. Null
  // until there are at least two weekly reflections to compare.
  let trend: Record<string, "up" | "same" | "down"> | null = null;
  if (recentWeeklies.length >= 2) {
    const cur = assessmentAreaScores(recentWeeklies[0]);
    const prev = assessmentAreaScores(recentWeeklies[1]);
    trend = {};
    for (const area of EQ_AREAS) {
      const d = cur[area] - prev[area];
      trend[AREA_KEY[area]] = d > 0 ? "up" : d < 0 ? "down" : "same";
    }
  }

  const questionsPerArea = latest.type === "onboarding" ? 4 : 2;
  const maxPerArea = questionsPerArea * 4;
  const scores = assessmentAreaScores(latest);

  const areas = EQ_AREAS.map((area) => {
    const score = scores[area];
    return {
      area,
      key: AREA_KEY[area],
      score,
      max: maxPerArea,
      pct: Math.round((score / maxPerArea) * 100),
      level: getAreaLevel(score, questionsPerArea),
    };
  });

  const overallMax = maxPerArea * EQ_AREAS.length;

  return NextResponse.json({
    hasProfile: true,
    type: latest.type,
    completedAt: latest.completedAt.toISOString(),
    overall: {
      score: latest.totalScore,
      max: overallMax,
      pct: Math.round((latest.totalScore / overallMax) * 100),
    },
    areas,
    trend,
  });
}
