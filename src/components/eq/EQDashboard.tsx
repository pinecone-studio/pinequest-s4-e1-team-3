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

type EQLevel = "needs_more_support" | "developing" | "stable" | "strong_area";

type AreaRow = {
  area: EQArea;
  key: string;
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
    };

const TREND_META: Record<Trend, { glyph: string; color: string }> = {
  up: { glyph: "↑", color: "#5a8a4f" },
  same: { glyph: "→", color: "#9a8f7d" },
  down: { glyph: "↓", color: "#c2865a" },
};

const AREA_META: Record<EQArea, { label: string; color: string }> = {
  SELF_AWARENESS: { label: "Өөрийгөө таних", color: "#e0b32f" },
  SELF_REGULATION: { label: "Сэтгэлээ тайвшруулах", color: "#9a8fd0" },
  MOTIVATION: { label: "Дотоод хүсэл", color: "#ef9526" },
  EMPATHY: { label: "Бусдыг ойлгох", color: "#6f87c4" },
  SOCIAL_SKILLS: { label: "Харилцаа", color: "#e07ea3" },
};

const LEVEL_MN: Record<EQLevel, string> = {
  needs_more_support: "Дэмжлэг хэрэгтэй",
  developing: "Хөгжиж буй",
  stable: "Тогтвортой",
  strong_area: "Хүчтэй тал",
};

// Level → number of filled segments (out of 4).
const LEVEL_RANK: Record<EQLevel, number> = {
  needs_more_support: 1,
  developing: 2,
  stable: 3,
  strong_area: 4,
};

export function EQDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  // refreshKey is part of the URL so a change after submitting a weekly test
  // forces a re-fetch via useFetchJson.
  const { data } = useFetchJson<ProfileData>(`/api/eq/profile?r=${refreshKey}`);

  if (!data || !data.hasProfile) return null;

  // Strongest / focus area — ranked by raw score (used only for ordering,
  // never displayed). Highest = strongest, lowest = worth focusing on.
  const sorted = [...data.areas].sort((a, b) => b.score - a.score);
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

        {/* Per-area level bars (4 segments each) */}
        <div style={bars}>
          {data.areas.map((a) => {
            const meta = AREA_META[a.area];
            const filled = LEVEL_RANK[a.level];
            const tr = data.trend?.[a.key];
            return (
              <div key={a.key} style={barRow}>
                <div style={barHead}>
                  <span style={barLabel}>{meta.label}</span>
                  <span style={barRight}>
                    {tr && (
                      <span
                        style={{ ...trendGlyph, color: TREND_META[tr].color }}
                        title="Өнгөрсөн долоо хоногтой харьцуулахад"
                      >
                        {TREND_META[tr].glyph}
                      </span>
                    )}
                    <span style={{ ...barLevel, color: meta.color }}>
                      {LEVEL_MN[a.level]}
                    </span>
                  </span>
                </div>
                <div style={segWrap}>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      style={{
                        ...seg,
                        background: i < filled ? meta.color : "rgba(58,50,40,0.12)",
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
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

const bars: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 11 };
const barRow: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const barHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline" };
const barLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3a3228" };
const barRight: React.CSSProperties = { display: "flex", alignItems: "baseline", gap: 6 };
const trendGlyph: React.CSSProperties = { fontSize: 13, fontWeight: 800 };
const barLevel: React.CSSProperties = { fontSize: 11, fontWeight: 700 };
const segWrap: React.CSSProperties = { display: "flex", gap: 4 };
const seg: React.CSSProperties = { flex: 1, height: 8, borderRadius: 4, transition: "background 0.3s ease" };
