// ============================================
//  EQDashboard.tsx
//
//  Compact EQ snapshot shown in the empty banner space of the Check-in
//  (Reflection) panel. Deliberately NOT a score/percentage — a % reads like
//  a school grade and implies a ceiling, which is against the app's
//  supportive, non-exam philosophy. Instead it shows, per Goleman area, a
//  4-step level (Дэмжлэг хэрэгтэй → Хүчтэй тал) plus a gentle summary of the
//  user's strongest area and the one worth focusing on next.
//
//  Read-only; data from GET /api/eq/profile.
// ============================================

"use client";

import type { EQArea } from "@prisma/client";
import { useFetchJson } from "@/hooks/useFetchJson";
import { FlowerStatsRadar } from "@/components/garden/FlowerStatsRadar";
import type { AreaKey } from "@/lib/eqScoring";

type EQLevel = "needs_more_support" | "developing" | "stable" | "strong_area";

type AreaRow = {
  area: EQArea;
  key: AreaKey;
  score: number;
  max: number;
  pct: number;
  level: EQLevel;
};

type Trend = "up" | "same" | "down";

type ProfileData =
  | { hasProfile: false }
  | {
      hasProfile: true;
      type: "onboarding" | "weekly";
      completedAt: string;
      overall: { score: number; max: number; pct: number };
      areas: AreaRow[];
      trend: Record<string, Trend> | null;
      // Per-area blended % (Test + Chat Analysis + Task Behavior), 0-100.
      blendedScores: Record<AreaKey, number>;
    };

const AREA_META: Record<EQArea, { label: string; color: string }> = {
  SELF_AWARENESS: { label: "Өөрийгөө таних", color: "#e0b32f" },
  SELF_REGULATION: { label: "Сэтгэлээ тайвшруулах", color: "#9a8fd0" },
  MOTIVATION: { label: "Дотоод хүсэл", color: "#ef9526" },
  EMPATHY: { label: "Бусдыг ойлгох", color: "#6f87c4" },
  SOCIAL_SKILLS: { label: "Бусадтай харилцах", color: "#e07ea3" },
};

export function EQDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  // refreshKey is part of the URL so a change after submitting a weekly test
  // forces a re-fetch via useFetchJson.
  const { data } = useFetchJson<ProfileData>(`/api/eq/profile?r=${refreshKey}`);

  if (!data || !data.hasProfile) return null;

  // Strongest / focus area — ranked by the blended score (used only for
  // ordering, never displayed). Highest = strongest, lowest = worth focusing on.
  const sorted = [...data.areas].sort(
    (a, b) => data.blendedScores[b.key] - data.blendedScores[a.key],
  );
  const strongest = sorted[0];
  const support = sorted[sorted.length - 1];

  return (
    <div style={positioner}>
      <div style={card}>
        <div style={cardTitle}>Чиний EQ зураглал</div>
        <div style={cardSub}>Шүүлт биш — өсөлтийнхөө эхлэлийн цэг</div>

        {/* Gentle summary */}
        <div style={summary}>
          <span style={summaryItem}>
            🌟 Хүчтэй тал:{" "}
            <b style={{ color: AREA_META[strongest.area].color }}>
              {AREA_META[strongest.area].label}
            </b>
          </span>
          <span style={summaryItem}>
            🎯 Анхаарах нь:{" "}
            <b style={{ color: AREA_META[support.area].color }}>
              {AREA_META[support.area].label}
            </b>
          </span>
        </div>

        {/* Pentagon radar — one axis per Goleman area, filled to its level */}
        <div style={radarWrap}>
          <FlowerStatsRadar
            axes={data.areas.map((a) => ({
              label: AREA_META[a.area].label,
              value: data.blendedScores[a.key],
              color: AREA_META[a.area].color,
            }))}
            max={100}
          />
        </div>
      </div>
    </div>
  );
}

// Fills the overlay (inset:0) but never blocks the bottom sheet's button:
// pointer-events none, anchored to the top empty band of the banner.
const positioner: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  padding: "70px 16px 0",
  pointerEvents: "none",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "rgba(252,248,240,0.93)",
  backdropFilter: "blur(6px)",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: 18,
  padding: "15px 18px 17px",
  boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
};

const cardTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  color: "#3a3228",
  textAlign: "center",
  marginBottom: 2,
};
const cardSub: React.CSSProperties = {
  fontSize: 11,
  color: "#9a8f7d",
  textAlign: "center",
  marginBottom: 12,
};

const summary: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "10px 12px",
  marginBottom: 14,
  background: "rgba(122,158,114,0.1)",
  borderRadius: 12,
};
const summaryItem: React.CSSProperties = { fontSize: 12.5, color: "#3a3228" };

const radarWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  margin: "2px 0 2px",
};
