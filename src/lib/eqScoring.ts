// ============================================
//  eqScoring.ts
//
//  Pure scoring logic for the EQ assessment system. No DB, no I/O — the
//  API routes (src/app/api/eq/*) resolve submitted answers, call these
//  functions, persist the result, and console.log it.
//
//  Goleman's 5 areas are referenced three ways in this codebase:
//    - EQArea enum (DB)         : SELF_AWARENESS …            (prisma)
//    - AreaKey (output/log)     : selfAwareness …             (spec shape)
//    - per-area score columns   : selfAwarenessScore …        (UserEQProfile/EQAssessment)
//  EQ_AREAS / AREA_KEY / AREA_SCORE_FIELD below bridge them.
//
//  Levels are intentionally supportive — never "weak/bad/poor":
//    needs_more_support | developing | stable | strong_area
// ============================================

import type { EQArea } from "@prisma/client";
import { QUESTIONS_BY_ID, type EQQuestion } from "@/lib/eqQuestions";

export type AreaKey =
  | "selfAwareness"
  | "selfRegulation"
  | "motivation"
  | "empathy"
  | "socialSkills";

export type EQLevel =
  | "needs_more_support"
  | "developing"
  | "stable"
  | "strong_area";

export const EQ_AREAS: EQArea[] = [
  "SELF_AWARENESS",
  "SELF_REGULATION",
  "MOTIVATION",
  "EMPATHY",
  "SOCIAL_SKILLS",
];

export const AREA_KEY: Record<EQArea, AreaKey> = {
  SELF_AWARENESS: "selfAwareness",
  SELF_REGULATION: "selfRegulation",
  MOTIVATION: "motivation",
  EMPATHY: "empathy",
  SOCIAL_SKILLS: "socialSkills",
};

// Per-area Int column name shared by UserEQProfile and EQAssessment.
export const AREA_SCORE_FIELD: Record<EQArea, string> = {
  SELF_AWARENESS: "selfAwarenessScore",
  SELF_REGULATION: "selfRegulationScore",
  MOTIVATION: "motivationScore",
  EMPATHY: "empathyScore",
  SOCIAL_SKILLS: "socialSkillsScore",
};

// Short, non-clinical coaching hint per area (used in the combined profile
// log). English, internal-only — not shown to the user.
const COACHING_BY_AREA: Record<EQArea, string> = {
  SELF_AWARENESS:
    "Help the user notice and name what they feel before reacting.",
  SELF_REGULATION:
    "Help the user practice pausing before responding during emotionally intense moments.",
  MOTIVATION:
    "Help the user reconnect with one small thing that genuinely matters to them.",
  EMPATHY:
    "Help the user consider one alternative explanation for another person's behavior.",
  SOCIAL_SKILLS:
    "Help the user say what they mean calmly and clearly, without bottling up or lashing out.",
};

// ----------------------------------------------
//  Answer resolution
//
//  The client only sends { questionId, selectedOption } — never scores.
//  We re-derive eqArea + score from the question bank (the source of truth)
//  so submitted scores can't be tampered with.
// ----------------------------------------------
export interface RawAnswer {
  questionId: string;
  selectedOption: string;
}

export interface ResolvedAnswer {
  questionId: string;
  eqArea: EQArea;
  selectedOption: string;
  score: number;
}

export function resolveAnswers(raw: RawAnswer[]): ResolvedAnswer[] {
  const resolved: ResolvedAnswer[] = [];
  for (const a of raw) {
    const q: EQQuestion | undefined = QUESTIONS_BY_ID[a?.questionId];
    if (!q) continue;
    const opt = q.options.find((o) => o.label === a.selectedOption);
    if (!opt) continue;
    resolved.push({
      questionId: q.id,
      eqArea: q.eqArea,
      selectedOption: opt.label,
      score: opt.score,
    });
  }
  return resolved;
}

// ----------------------------------------------
//  Level + area helpers
// ----------------------------------------------

// Map a raw area score to a supportive level. Driven by the fraction of the
// area's max (questionsPerArea * 4); the thresholds below reproduce the
// spec's onboarding (4/area) and weekly (2/area) tables exactly.
export function getAreaLevel(score: number, questionsPerArea: number): EQLevel {
  const max = Math.max(1, questionsPerArea * 4);
  const f = score / max;
  if (f < 0.45) return "needs_more_support";
  if (f < 0.7) return "developing";
  if (f <= 0.875) return "stable";
  return "strong_area";
}

export type AreaScores = Record<EQArea, number>;

function emptyAreaScores(): AreaScores {
  return {
    SELF_AWARENESS: 0,
    SELF_REGULATION: 0,
    MOTIVATION: 0,
    EMPATHY: 0,
    SOCIAL_SKILLS: 0,
  };
}

export function findStrongestArea(scores: AreaScores): EQArea {
  return EQ_AREAS.reduce((best, a) => (scores[a] > scores[best] ? a : best), EQ_AREAS[0]);
}

export function findSupportArea(scores: AreaScores): EQArea {
  return EQ_AREAS.reduce((low, a) => (scores[a] < scores[low] ? a : low), EQ_AREAS[0]);
}

// ----------------------------------------------
//  Result shapes
// ----------------------------------------------
export interface AreaResult {
  score: number;
  level: EQLevel;
  changeFromLastWeek?: string; // "+1" | "0" | "-2" (weekly only)
}

export interface EQResult {
  totalScore: number;
  maxScore: number;
  areaScores: AreaScores; // raw per-area sums (for persistence)
  areas: Record<AreaKey, AreaResult>; // presentation shape (for logs/UI)
  strongestArea: EQArea;
  supportArea: EQArea;
  suggestedFocusForNextWeek?: EQArea; // weekly only
}

// Sum resolved answers into per-area totals + per-area counts.
function tallyAnswers(answers: ResolvedAnswer[]): {
  scores: AreaScores;
  counts: Record<EQArea, number>;
} {
  const scores = emptyAreaScores();
  const counts = emptyAreaScores();
  for (const a of answers) {
    scores[a.eqArea] += a.score;
    counts[a.eqArea] += 1;
  }
  return { scores, counts };
}

function buildAreas(
  scores: AreaScores,
  counts: Record<EQArea, number>,
  fallbackQuestionsPerArea: number,
  previous?: AreaScores | null,
): Record<AreaKey, AreaResult> {
  const out = {} as Record<AreaKey, AreaResult>;
  for (const area of EQ_AREAS) {
    const perArea = counts[area] || fallbackQuestionsPerArea;
    const result: AreaResult = {
      score: scores[area],
      level: getAreaLevel(scores[area], perArea),
    };
    if (previous) {
      const diff = scores[area] - (previous[area] ?? 0);
      result.changeFromLastWeek = diff > 0 ? `+${diff}` : `${diff}`;
    }
    out[AREA_KEY[area]] = result;
  }
  return out;
}

// ----------------------------------------------
//  Onboarding (20 questions, 4 per area)
// ----------------------------------------------
export function calculateOnboardingEQResult(answers: ResolvedAnswer[]): EQResult {
  const { scores, counts } = tallyAnswers(answers);
  const totalScore = EQ_AREAS.reduce((s, a) => s + scores[a], 0);
  return {
    totalScore,
    maxScore: answers.length * 4,
    areaScores: scores,
    areas: buildAreas(scores, counts, 4),
    strongestArea: findStrongestArea(scores),
    supportArea: findSupportArea(scores),
  };
}

// ----------------------------------------------
//  Weekly (10 questions, 2 per area)
// ----------------------------------------------
export function calculateWeeklyEQResult(
  answers: ResolvedAnswer[],
  previous?: AreaScores | null,
): EQResult {
  const { scores, counts } = tallyAnswers(answers);
  const totalScore = EQ_AREAS.reduce((s, a) => s + scores[a], 0);
  const supportArea = findSupportArea(scores);
  return {
    totalScore,
    maxScore: answers.length * 4,
    areaScores: scores,
    areas: buildAreas(scores, counts, 2, previous),
    strongestArea: findStrongestArea(scores),
    supportArea,
    suggestedFocusForNextWeek: supportArea,
  };
}

// ----------------------------------------------
//  Combined profile (onboarding + latest weekly + conversation signals)
// ----------------------------------------------

// Minimal structural types so this stays decoupled from Prisma's generated
// types while accepting the rows the route loads.
export interface AssessmentLike {
  selfAwarenessScore: number;
  selfRegulationScore: number;
  motivationScore: number;
  empathyScore: number;
  socialSkillsScore: number;
  strongestArea: EQArea;
  supportArea: EQArea;
}

export interface SignalLike {
  eqArea: EQArea;
  pattern: string | null;
  gentleInsight: string | null;
  confidence: number;
}

export function assessmentAreaScores(a: AssessmentLike): AreaScores {
  return {
    SELF_AWARENESS: a.selfAwarenessScore,
    SELF_REGULATION: a.selfRegulationScore,
    MOTIVATION: a.motivationScore,
    EMPATHY: a.empathyScore,
    SOCIAL_SKILLS: a.socialSkillsScore,
  };
}

export interface CombinedEQProfile {
  type: "combined_eq_profile";
  userId: string;
  initialProfile: { strongestArea: AreaKey; supportArea: AreaKey } | null;
  latestWeeklyProfile: { strongestArea: AreaKey; supportArea: AreaKey } | null;
  conversationSignalSummary: {
    mostDetectedArea: AreaKey | null;
    repeatedPatterns: string[];
  };
  // Where currentSuggestedFocus came from. Behavior (conversation) outweighs
  // the self-report tests once there's enough of it.
  evidenceSource: "conversation" | "weekly" | "onboarding" | null;
  currentSuggestedFocus: AreaKey | null;
  nextCoachingSuggestion: string | null;
}

export function calculateCombinedEQProfile({
  userId,
  onboarding,
  latestWeekly,
  signals,
}: {
  userId: string;
  onboarding: AssessmentLike | null;
  latestWeekly: AssessmentLike | null;
  signals: SignalLike[];
}): CombinedEQProfile {
  // Weight signals per area by confidence (a confident, repeated behavioral
  // signal counts for more than a single low-confidence guess).
  const weight = emptyAreaScores();
  for (const s of signals) {
    const c = typeof s.confidence === "number" && s.confidence > 0 ? s.confidence : 0.5;
    weight[s.eqArea] += c;
  }
  const totalEvidence = EQ_AREAS.reduce((sum, a) => sum + weight[a], 0);
  const mostDetected = signals.length > 0 ? findStrongestArea(weight) : null;

  // A few distinct, human-readable patterns (pattern or gentle insight).
  const repeatedPatterns = Array.from(
    new Set(
      signals
        .map((s) => s.pattern ?? s.gentleInsight)
        .filter((p): p is string => !!p),
    ),
  ).slice(0, 5);

  // Behavior over self-report: once there's enough conversational evidence
  // (~2 mid-confidence signals), let it drive the focus area; otherwise fall
  // back to the latest weekly's support area, then onboarding's.
  const EVIDENCE_THRESHOLD = 1.5;
  let focusArea: EQArea | null;
  let evidenceSource: CombinedEQProfile["evidenceSource"];
  if (mostDetected && totalEvidence >= EVIDENCE_THRESHOLD) {
    focusArea = mostDetected;
    evidenceSource = "conversation";
  } else if (latestWeekly?.supportArea) {
    focusArea = latestWeekly.supportArea;
    evidenceSource = "weekly";
  } else if (onboarding?.supportArea) {
    focusArea = onboarding.supportArea;
    evidenceSource = "onboarding";
  } else {
    focusArea = null;
    evidenceSource = null;
  }

  return {
    type: "combined_eq_profile",
    userId,
    initialProfile: onboarding
      ? {
          strongestArea: AREA_KEY[onboarding.strongestArea],
          supportArea: AREA_KEY[onboarding.supportArea],
        }
      : null,
    latestWeeklyProfile: latestWeekly
      ? {
          strongestArea: AREA_KEY[latestWeekly.strongestArea],
          supportArea: AREA_KEY[latestWeekly.supportArea],
        }
      : null,
    conversationSignalSummary: {
      mostDetectedArea: mostDetected ? AREA_KEY[mostDetected] : null,
      repeatedPatterns,
    },
    evidenceSource,
    currentSuggestedFocus: focusArea ? AREA_KEY[focusArea] : null,
    nextCoachingSuggestion: focusArea ? COACHING_BY_AREA[focusArea] : null,
  };
}
