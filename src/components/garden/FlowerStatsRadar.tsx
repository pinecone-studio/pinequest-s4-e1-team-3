// ============================================
//  FlowerStatsRadar.tsx
//
//  A small pentagon "radar" chart used by the EQ dashboard and the
//  Botanist's Desk. Each axis is one EQ area / flower species and the
//  filled shape shows how far along that area is.
//
//  Pure inline SVG so it needs no charting dependency: thin grey spokes
//  + concentric pentagon rings for the grid, a bold outer outline, and a
//  translucent data polygon with a dot at each vertex tinted by the
//  area's own colour. Vertex labels wrap onto two lines so longer
//  (Mongolian) names still fit.
// ============================================

"use client";

import "./FlowerStatsRadar.css";

export interface RadarAxis {
  /** Label drawn at the vertex (e.g. the EQ area or species name). */
  label: string;
  /** Raw score for this axis, 0..max. */
  value: number;
  /** Hex colour used for the vertex dot. */
  color: string;
}

// Wider than tall so the side labels have horizontal room to breathe.
const W = 380;
const H = 300;
const CX = W / 2;
const CY = 150;
const RADIUS = 92; // distance from centre to the outer pentagon
const RINGS = 4; // concentric grid rings

/** Vertex position for axis `i` of `n`, at a given 0..1 fraction of the radius.
 *  Starts at the top (−90°) and goes clockwise so the first axis points up. */
function point(i: number, n: number, frac: number) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return {
    x: CX + Math.cos(angle) * RADIUS * frac,
    y: CY + Math.sin(angle) * RADIUS * frac,
  };
}

function polygon(n: number, frac: number) {
  return Array.from({ length: n }, (_, i) => {
    const { x, y } = point(i, n, frac);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

/** Split a label onto at most two lines (on its spaces) so long names fit. */
function wrapLabel(label: string): string[] {
  const words = label.split(" ");
  if (words.length < 2) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function FlowerStatsRadar({
  axes,
  max,
}: {
  axes: RadarAxis[];
  /** Value mapped to the outer edge of the pentagon. */
  max: number;
}) {
  const n = axes.length;
  const safeMax = max > 0 ? max : 1;

  const dataPoints = axes.map((a, i) => point(i, n, Math.min(a.value, safeMax) / safeMax));

  return (
    <svg
      className="fs-radar"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="EQ areas overview"
    >
      {/* concentric grid rings */}
      {Array.from({ length: RINGS }, (_, r) => (
        <polygon
          key={`ring-${r}`}
          className="fs-radar-ring"
          points={polygon(n, (r + 1) / RINGS)}
        />
      ))}

      {/* spokes from the centre to each vertex */}
      {axes.map((_, i) => {
        const { x, y } = point(i, n, 1);
        return (
          <line key={`spoke-${i}`} className="fs-radar-spoke" x1={CX} y1={CY} x2={x} y2={y} />
        );
      })}

      {/* bold outer pentagon outline */}
      <polygon className="fs-radar-outline" points={polygon(n, 1)} />

      {/* the data shape */}
      <polygon className="fs-radar-area" points={dataPoints.map((p) => `${p.x},${p.y}`).join(" ")} />

      {/* coloured dot at each data vertex */}
      {dataPoints.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} fill={axes[i].color} stroke="#fff" strokeWidth={1.2} />
      ))}

      {/* axis labels just outside each vertex, wrapped onto up to two lines */}
      {axes.map((a, i) => {
        const { x, y } = point(i, n, 1.16);
        const anchor = x < CX - 4 ? "end" : x > CX + 4 ? "start" : "middle";
        const lines = wrapLabel(a.label);
        const dy0 = -((lines.length - 1) * 0.6);
        return (
          <text key={`label-${i}`} className="fs-radar-label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
            {lines.map((line, li) => (
              <tspan key={li} x={x} dy={`${li === 0 ? dy0 : 1.2}em`}>
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
