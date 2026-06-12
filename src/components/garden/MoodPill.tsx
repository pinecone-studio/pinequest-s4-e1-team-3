"use client";

<<<<<<< Updated upstream
import { useState } from "react";
=======
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Sun, CloudSun, Cloudy, CloudFog,
  Wind, CloudDrizzle, CloudRain, CloudRainWind, CloudLightning,
} from "lucide-react";
>>>>>>> Stashed changes
import { useFetchJson } from "@/hooks/useFetchJson";
import type { ForecastDay } from "./types";

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️",
  partly_cloudy: "🌤️",
  clear_sky: "🌞",
  rainy: "🌧️",
  light_rain: "🌦️",
  heavy_rain: "🌩️",
  windy: "💨",
  foggy: "🌫️",
  cloudy: "☁️",
  stormy: "⛈️",
};

const WEATHER_PHRASES: Record<string, string> = {
  sunny: "Тунгалаг тэнгэр",
  partly_cloudy: "Тайван тэнгэр",
  clear_sky: "Цэлмэг тэнгэр",
  rainy: "Зөөлөн бороо",
  light_rain: "Шиврээ бороо",
  heavy_rain: "Их бороо",
  windy: "Тогтворгүй салхи",
  foggy: "Манантай",
  cloudy: "Намуун үүлс",
  stormy: "Хүчтэй шуурга",
};

// 1 = sunny (best, graph bottom)  5 = heavy storm (worst, graph top)
const WEATHER_SCORE: Record<string, number> = {
  clear_sky: 1,
  sunny: 1,
  partly_cloudy: 2,
  cloudy: 2,
  foggy: 2.5,
  windy: 3,
  light_rain: 3,
  rainy: 4,
  heavy_rain: 5,
  stormy: 5,
};

const MOOD_PHRASES: Record<string, string> = {
  calm: "Тайван, найдвартай",
  happy: "Гэгээлэг",
  grateful: "Талархалтай",
  sad: "Бага зэрэг хүнд",
  reflective: "Эмзэг",
  anxious: "Тайван бус",
  motivated: "Урам зоригтой",
  confused: "Эргэлзээтэй",
  angry: "Уурласан",
};

function moodPhrase(mood: string) {
  return MOOD_PHRASES[mood] ?? mood.charAt(0).toUpperCase() + mood.slice(1);
}

function getCurrentWeekFromMonday(): string[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const toMonday = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + toMonday + i);
    return d.toISOString().slice(0, 10);
  });
}


// SVG layout
const W = 306, H = 118;
const PL = 26, PR = 14, PT = 20, PB = 10;
const DW = W - PL - PR;
const DH = H - PT - PB;
const AX = PL;           // x of Y-axis line
const AY = PT + DH;      // y of X-axis line

function scoreToY(score: number): number {
  // score 1 (sunny) → bottom (AY), score 5 (stormy) → top (PT)
  return PT + DH * (1 - (score - 1) / 4);
}

type Pt = { x: number; y: number };

function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function MoodPill() {
  const { data: apiData } = useFetchJson<ForecastDay[]>("/api/forecast?period=weekly");
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const pulseControls = useAnimationControls();

  const dataMap = Object.fromEntries((apiData ?? []).map((d: ForecastDay) => [d.date, d]));
  const days = getCurrentWeekFromMonday();
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = dataMap[todayStr] ?? null;

  // #8 — pulse the pill whenever today's mood/weather actually changes
  // (not on first load). `layout` on the button smooths the width change
  // when the label text gets longer or shorter.
  const prevWeather = useRef<string | undefined>(undefined);
  useEffect(() => {
    const w = today?.weather;
    if (
      prevWeather.current !== undefined &&
      prevWeather.current !== w &&
      !reduceMotion
    ) {
      pulseControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.4, ease: "easeInOut" },
      });
    }
    prevWeather.current = w;
  }, [today?.weather, reduceMotion, pulseControls]);

  type PtData = { x: number; y: number | null; day: ForecastDay | undefined; dateStr: string };
  const pts: PtData[] = days.map((dateStr: string, i: number) => {
    const day = dataMap[dateStr];
    const x = AX + (i / (days.length - 1)) * DW;
    const score = day ? (WEATHER_SCORE[day.weather] ?? 3) : null;
    const y = score !== null ? scoreToY(score) : null;
    return { x, y, day, dateStr };
  });

  const allDataPts = pts.filter((p) => p.y !== null).map((p) => ({ x: p.x, y: p.y as number }));
  const segments: Pt[][] = allDataPts.length >= 2 ? [allDataPts] : [];

  const yTicks = [1, 2, 3, 4, 5];

  return (
    <div style={{ position: "relative" }} data-tutorial-target="mood-tracker">
      <motion.button
        type="button"
        className="garden-pill-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        layout={!reduceMotion}
        animate={pulseControls}
      >
        <span aria-hidden>{today ? (WEATHER_EMOJI[today.weather] ?? "🌥️") : "🌥️"}</span>
        <span className="value">
          {today ? (WEATHER_PHRASES[today.weather] ?? "Тайван тэнгэр") : "Тайван тэнгэр"}
        </span>
      </motion.button>

      {open && (
        <div className="garden-mood-dropdown" style={{ padding: "14px 14px 10px", minWidth: W + 28 }}>
          <p className="garden-mood-dropdown-eyebrow" style={{ marginBottom: 10 }}>
            Өнгөрсөн долоо хоног
          </p>

          <div style={{ position: "relative", width: W, height: H }}>
          <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>

            {/* Horizontal grid lines + Y-axis tick labels */}
            {yTicks.map((score) => {
              const y = scoreToY(score);
              return (
                <g key={score}>
                  <line
                    x1={AX} y1={y} x2={W - PR} y2={y}
                    stroke="rgba(58,58,44,0.1)"
                    strokeWidth={1}
                  />
                  {/* Tick mark on axis */}
                  <line
                    x1={AX - 3} y1={y} x2={AX} y2={y}
                    stroke="rgba(58,58,44,0.4)"
                    strokeWidth={1}
                  />
                  {/* Label */}
                  <text
                    x={AX - 6}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={9}
                    fill="rgba(58,58,44,0.65)"
                    style={{ userSelect: "none" }}
                  >
                    {score}
                  </text>
                </g>
              );
            })}

            {/* Vertical grid lines at each day */}
            {pts.map((p) => (
              <line
                key={p.dateStr}
                x1={p.x} y1={PT} x2={p.x} y2={AY}
                stroke="rgba(58,58,44,0.07)"
                strokeWidth={1}
              />
            ))}

            {/* Y-axis line */}
            <line
              x1={AX} y1={PT - 10} x2={AX} y2={AY}
              stroke="rgba(58,58,44,0.4)"
              strokeWidth={1.5}
            />
            {/* Y-axis arrow (up) */}
            <polygon
              points={`${AX - 4},${PT - 8} ${AX},${PT - 16} ${AX + 4},${PT - 8}`}
              fill="rgba(58,58,44,0.4)"
            />

            {/* X-axis line */}
            <line
              x1={AX} y1={AY} x2={W - PR + 10} y2={AY}
              stroke="rgba(58,58,44,0.4)"
              strokeWidth={1.5}
            />
            {/* X-axis arrow (right) */}
            <polygon
              points={`${W - PR + 8},${AY - 4} ${W - PR + 16},${AY} ${W - PR + 8},${AY + 4}`}
              fill="rgba(58,58,44,0.4)"
            />

            {/* Smooth line through data points */}
            {segments.map((seg, i) => (
              <path
                key={i}
                d={smoothPath(seg)}
                fill="none"
                stroke="rgba(109,191,158,0.9)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Dots + hover tooltip */}
            {pts.map((p) => {
              if (p.y === null) return null;
              const isToday = p.dateStr === todayStr;
              const isHov = hovered === p.dateStr;

              return (
                <g
                  key={p.dateStr}
                  onMouseEnter={() => setHovered(p.dateStr)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "default" }}
                >
                  {/* Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isToday ? 5.5 : 3.5}
                    fill={p.day?.rippleColor ?? "#6dbf9e"}
                    stroke={isToday ? "rgba(58,58,44,0.5)" : "rgba(58,58,44,0.15)"}
                    strokeWidth={isToday ? 2 : 1}
                  />

                  {/* Hover tooltip */}
                  {isHov && p.day && (
                    <g>
                      <rect
                        x={p.x - 32}
                        y={p.y + 9}
                        width={64}
                        height={18}
                        rx={5}
                        fill="rgba(58,58,44,0.88)"
                      />
                      <text
                        x={p.x}
                        y={p.y + 22}
                        textAnchor="middle"
                        fontSize={10}
                        fill="#f7f1e4"
                        style={{ userSelect: "none" }}
                      >
                        {moodPhrase(p.day.mood)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Emoji weather icons overlay */}
          {pts.map((p) => {
            if (p.y === null || !p.day) return null;
            const emoji = WEATHER_EMOJI[p.day.weather];
            if (!emoji) return null;
            const isToday = p.dateStr === todayStr;
            const size = isToday ? 18 : 14;
            return (
              <div
                key={p.dateStr}
                style={{
                  position: "absolute",
                  left: p.x - size / 2,
                  top: p.y - size - 7,
                  fontSize: size,
                  lineHeight: 1,
                  pointerEvents: "none",
                }}
              >
                {emoji}
              </div>
            );
          })}
          </div>

          {/* Day labels — each centered exactly under its dot */}
          <div style={{ position: "relative", width: W, height: 14, marginTop: 3 }}>
            {days.map((dateStr: string, i: number) => {
              const x = AX + (i / (days.length - 1)) * DW;
              const isToday = dateStr === todayStr;
              const label = new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "narrow",
              });
              return (
                <div
                  key={dateStr}
                  style={{
                    position: "absolute",
                    left: x,
                    transform: "translateX(-50%)",
                    fontSize: 9,
                    color: isToday ? "#3a3a2c" : "rgba(58,58,44,0.45)",
                    fontWeight: isToday ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
