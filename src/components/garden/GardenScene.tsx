// ============================================
//  GardenScene.tsx
//
//  The main field: a full-bleed painted illustration with every one
//  of the user's flowers placed at its stored (posX, posY) position,
//  plus the floating chrome that frames it — the welcome label, the
//  mood pill, the category filter bar, and the night-mode toggle
//  (owned by GardenShell, passed in as nightMode prop).
//
//  Flower data comes from GET /api/flowers (via useFetchJson — no
//  fetch logic lives here, only rendering + the "what happens on
//  click" decision):
//    - Flower with a conversation  → open its chat
//    - No flowers yet              → show the first-time hint and
//                                    let the user jump to the Workshop
//
//  Loading/error states are handled inline since they're one-line
//  each; the heavier per-flower rendering is delegated to FlowerSprite,
//  and the mood chip to MoodPill.
// ============================================

"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFetchJson } from "@/hooks/useFetchJson";
import { FlowerSprite } from "./FlowerSprite";
import { MoodPill } from "./MoodPill";
import type { FlowerSummary } from "./types";

const SPECIES_CATEGORY: Record<string, string> = {
  daisy: "career",
  lavender: "stress-relief",
  rose: "relationships",
  iris: "self-reflection",
};

const FILTERS: { key: string; label: string; color?: string }[] = [
  { key: "all", label: "All" },
  { key: "career", label: "Career", color: "#d8c27a" },
  { key: "stress-relief", label: "Stress Relief", color: "#b6a8cf" },
  { key: "relationships", label: "Relationships", color: "#cf8aa0" },
  { key: "self-reflection", label: "Self-Reflection", color: "#9b8ec4" },
];

const TIME_PRESETS = [
  {
    key: "golden",
    label: "Golden hour",
    icon: "☀️",
    filter: "none",
    tint: "transparent",
  },
  {
    key: "evening",
    label: "Evening",
    icon: "🌙",
    filter: "brightness(0.72) saturate(0.8) hue-rotate(200deg)",
    tint: "rgba(64, 52, 110, 0.18)",
  },
];

// World is WORLD_RATIO × viewport-height wide so there's room to pan.
// At 16:9 (900px tall) → 2250px wide vs ~1600px vp = 650px of panning slack.
const WORLD_RATIO = 2.5;

// Birds: top position (% of scene height), flight duration, stagger delay
const BIRDS = [
  { top: "11%", duration: "30s", delay: "0s", size: 130 },
  { top: "7%", duration: "38s", delay: "-14s", size: 108 },
  { top: "17%", duration: "24s", delay: "-22s", size: 116 },
];

// Fireflies — positions as % of world width / scene height, with per-fly timing
const FIREFLIES: Array<{
  x: number;
  y: number;
  delay: string;
  dur: string;
  size: number;
}> = [
  { x: 3, y: 58, delay: "0s", dur: "3.2s", size: 5 },
  { x: 7, y: 65, delay: "1.2s", dur: "4.5s", size: 4 },
  { x: 1, y: 72, delay: "2.8s", dur: "3.8s", size: 6 },
  { x: 11, y: 57, delay: "0.5s", dur: "4.1s", size: 4 },
  { x: 15, y: 66, delay: "1.9s", dur: "3.5s", size: 5 },
  { x: 19, y: 74, delay: "3.1s", dur: "4.8s", size: 4 },
  { x: 23, y: 54, delay: "0.7s", dur: "3.1s", size: 5 },
  { x: 27, y: 69, delay: "2.0s", dur: "4.2s", size: 4 },
  { x: 31, y: 60, delay: "1.4s", dur: "3.7s", size: 6 },
  { x: 35, y: 76, delay: "3.8s", dur: "5.0s", size: 4 },
  { x: 39, y: 51, delay: "0.3s", dur: "3.4s", size: 5 },
  { x: 37, y: 44, delay: "2.4s", dur: "3.9s", size: 3 },
  { x: 41, y: 38, delay: "4.0s", dur: "4.2s", size: 3 },
  { x: 44, y: 42, delay: "1.7s", dur: "5.5s", size: 4 },
  { x: 43, y: 67, delay: "2.5s", dur: "4.6s", size: 4 },
  { x: 47, y: 60, delay: "1.1s", dur: "3.9s", size: 5 },
  { x: 51, y: 76, delay: "3.5s", dur: "4.3s", size: 4 },
  { x: 55, y: 54, delay: "0.6s", dur: "3.6s", size: 6 },
  { x: 59, y: 71, delay: "2.2s", dur: "4.4s", size: 4 },
  { x: 63, y: 58, delay: "1.6s", dur: "3.3s", size: 5 },
  { x: 67, y: 73, delay: "3.0s", dur: "4.7s", size: 4 },
  { x: 71, y: 62, delay: "0.9s", dur: "3.8s", size: 5 },
  { x: 75, y: 54, delay: "2.7s", dur: "5.2s", size: 4 },
  { x: 79, y: 69, delay: "1.3s", dur: "4.0s", size: 6 },
  { x: 83, y: 57, delay: "3.6s", dur: "3.5s", size: 4 },
  { x: 87, y: 73, delay: "0.4s", dur: "4.9s", size: 5 },
  { x: 91, y: 60, delay: "2.0s", dur: "3.2s", size: 4 },
  { x: 95, y: 55, delay: "1.7s", dur: "4.1s", size: 5 },
  { x: 98, y: 69, delay: "3.3s", dur: "3.7s", size: 4 },
  { x: 5, y: 82, delay: "1.0s", dur: "4.6s", size: 3 },
  { x: 20, y: 84, delay: "2.6s", dur: "3.3s", size: 4 },
  { x: 88, y: 81, delay: "0.2s", dur: "4.0s", size: 3 },
  { x: 96, y: 78, delay: "3.9s", dur: "5.1s", size: 4 },
];

const EASE = 0.1; // how fast cur chases target (lower = floatier)
const FRICTION = 0.88; // inertia decay per frame

function clampX(x: number, worldPx: number, vpW: number): number {
  return Math.max(Math.min(0, vpW - worldPx), Math.min(0, x));
}

export function GardenScene({
  onOpenWorkshop,
  onOpenMemoryTree,
  onOpenPond,
  userName,
  nightMode = false,
}: {
  onOpenWorkshop: () => void;
  onOpenMemoryTree: () => void;
  onOpenPond: () => void;
  userName: string;
  nightMode?: boolean;
}) {
  const router = useRouter();
  const {
    data: flowers,
    loading,
    error,
  } = useFetchJson<FlowerSummary[]>("/api/flowers");
  const [activeFilter, setActiveFilter] = useState("all");
  const time = nightMode ? TIME_PRESETS[1] : TIME_PRESETS[0];

  // DOM refs
  const vpRef = useRef<HTMLDivElement>(null); // the viewport element
  const bgRef = useRef<HTMLDivElement>(null); // background layer  (fx = 1)
  const objRef = useRef<HTMLDivElement>(null); // flowers layer     (fx = 1)

  // Pan state — all plain refs, no React state, so RAF never causes re-renders
  const worldW = useRef(0);
  const target = useRef(0); // where we want to be (snaps instantly)
  const cur = useRef(0); // where we are       (eases toward target)
  const drag = useRef({
    active: false,
    lastX: 0,
    lastDx: 0,
    startX: 0,
    moved: false,
  });
  const inertiaVx = useRef(0);
  const rafId = useRef<number>(0);

  // Hover-bird state: birds that fly from a hovered flower to the Memory Tree nav
  const [hoverBirds, setHoverBirds] = useState<
    Array<{ id: number; sx: number; sy: number; ex: number; ey: number }>
  >([]);
  const birdIdRef = useRef(0);

  useEffect(() => {
    const updateSize = () => {
      worldW.current = Math.round(window.innerHeight * WORLD_RATIO);
    };
    updateSize();
    window.addEventListener("resize", updateSize);

    // Non-passive wheel so we can preventDefault and take over scrolling
    const vp = vpRef.current;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      target.current = clampX(
        target.current - d,
        worldW.current,
        vp?.clientWidth ?? window.innerWidth,
      );
    };
    vp?.addEventListener("wheel", onWheel, { passive: false });

    const tick = () => {
      // apply inertia while not dragging
      if (!drag.current.active && Math.abs(inertiaVx.current) > 0.2) {
        inertiaVx.current *= FRICTION;
        target.current = clampX(
          target.current + inertiaVx.current,
          worldW.current,
          vp?.clientWidth ?? window.innerWidth,
        );
      }

      // ease cur → target
      cur.current += (target.current - cur.current) * EASE;
      const x = Math.round(cur.current);

      if (bgRef.current)
        bgRef.current.style.transform = `translate3d(${x}px,0,0)`;
      if (objRef.current)
        objRef.current.style.transform = `translate3d(${x}px,0,0)`;

      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", updateSize);
      vp?.removeEventListener("wheel", onWheel);
    };
  }, []);

  // ---- pointer handlers ----

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Don't capture pointer on interactive children — it steals their click events
    if ((e.target as HTMLElement).closest("button, a")) return;
    drag.current = {
      active: true,
      lastX: e.clientX,
      lastDx: 0,
      startX: e.clientX,
      moved: false,
    };
    inertiaVx.current = 0;
    if (vpRef.current) vpRef.current.style.cursor = "grabbing";
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.lastX;
    drag.current.lastDx = dx;
    drag.current.lastX = e.clientX;
    if (Math.abs(e.clientX - drag.current.startX) > 5)
      drag.current.moved = true;
    target.current = clampX(
      target.current + dx,
      worldW.current,
      vpRef.current?.clientWidth ?? window.innerWidth,
    );
  }

  function onPointerUp() {
    inertiaVx.current = drag.current.lastDx;
    drag.current.active = false;
    if (vpRef.current) vpRef.current.style.cursor = "grab";
  }

  function selectFlower(flower: FlowerSummary) {
    if (drag.current.moved) return; // panning, not clicking
    if (flower.conversationId) router.push(`/chat/${flower.conversationId}`);
  }

  function handleFlowerHover(flower: FlowerSummary) {
    const vpH = vpRef.current?.clientHeight ?? window.innerHeight;
    const sx = (flower.posX / 100) * worldW.current + cur.current;
    const sy = (flower.posY / 100) * vpH;

    // Aim for the Memory Tree nav button; fall back to upper-center if not found
    const memBtn = document.querySelector<HTMLElement>('[data-nav="memory"]');
    let ex = window.innerWidth * 0.58;
    let ey = 50;
    if (memBtn) {
      const r = memBtn.getBoundingClientRect();
      ex = r.left + r.width / 2;
      ey = r.top + r.height / 2;
    }

    const id = ++birdIdRef.current;
    setHoverBirds((prev) => [...prev, { id, sx, sy, ex, ey }]);
  }

  const worldLayer: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: `${WORLD_RATIO * 100}vh`,
    height: "100%",
    willChange: "transform",
  };

  return (
    <div
      ref={vpRef}
      className="garden-scene"
      style={{ cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Layer 1 — painted background + birds (fx = 1) */}
      <div
        ref={bgRef}
        style={{
          ...worldLayer,
          filter: time.filter,
          transition: "filter 1.2s ease",
        }}
      >
        <Image
          src="/garden/garden-bg.png"
          alt=""
          fill
          priority
          sizes={`${WORLD_RATIO * 100}vh`}
          style={{ objectFit: "cover" }}
        />

        {FIREFLIES.map((f, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: f.size,
                height: f.size,
                borderRadius: "50%",
                background: "#ffe07a",
                boxShadow: `0 0 ${f.size * 2}px ${f.size + 1}px rgba(255, 210, 70, 0.82)`,
                pointerEvents: "none",
                animation: `firefly-twinkle ${f.dur} ease-in-out ${f.delay} infinite`,
                zIndex: 3,
              }}
            />
          ))}

        {BIRDS.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: b.top,
              left: 0,
              width: b.size,
              height: Math.round(b.size * 0.56),
              animation: `garden-bird-fly ${b.duration} linear ${b.delay} infinite`,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <Image
              src="/garden/bird.gif"
              alt=""
              width={b.size}
              height={Math.round(b.size * 0.56)}
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Time-of-day tint — fixed to viewport */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          background: time.tint,
          pointerEvents: "none",
        }}
      />

      {/* Layer 2 — flowers + tree hotspot (same fx = 1, locked to the painting) */}
      <div ref={objRef} style={{ ...worldLayer, zIndex: 10 }}>
        {/* Invisible clickable region over the Memory Tree */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "28%", top: "8%", width: "26%", height: "80%" }}
          onClick={onOpenMemoryTree}
          aria-label="Open the Memory Tree"
          title="Open the Memory Tree"
        />

        {/* Invisible clickable region over the Greenhouse */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "74%", top: "10%", width: "20%", height: "72%" }}
          onClick={onOpenWorkshop}
          aria-label="Open the Greenhouse"
          title="Open the Greenhouse"
        />

        {/* Invisible clickable region over the Pond */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "50%", top: "68%", width: "50%", height: "30%" }}
          onClick={onOpenPond}
          aria-label="Open the Pond"
          title="Open the Pond"
        />

        {(flowers ?? []).map((flower) => {
          const category = SPECIES_CATEGORY[flower.species.key] ?? "";
          const dimmed = activeFilter !== "all" && category !== activeFilter;
          return (
            <FlowerSprite
              key={flower.id}
              flower={flower}
              onSelect={selectFlower}
              onHoverStart={handleFlowerHover}
              dimmed={dimmed}
              nightMode={nightMode}
            />
          );
        })}
      </div>

      {/* Fixed UI chrome — viewport-relative, never panned */}
      <p className="garden-welcome">
        {userName ? `Welcome back, ${userName}` : "Your garden"}
      </p>

      {loading && <p className="garden-hint">Loading your garden…</p>}
      {error && (
        <p className="garden-hint">Couldn&apos;t load your garden — {error}</p>
      )}
      {!loading && !error && (flowers?.length ?? 0) === 0 && (
        <button type="button" className="garden-hint" onClick={onOpenWorkshop}>
          Your garden is empty · visit the Workshop to plant your first flower
        </button>
      )}
      {!loading && (flowers?.length ?? 0) > 0 && (
        <p className="garden-hint">
          Click a flower to step into its conversation
        </p>
      )}

      {/* Hover birds — fixed to viewport, fly from flower to Memory Tree nav */}
      {hoverBirds.map((b) => (
        <div
          key={b.id}
          style={
            {
              position: "fixed",
              left: b.sx - 56,
              top: b.sy - 32,
              width: 112,
              height: 64,
              zIndex: 200,
              pointerEvents: "none",
              animation: "hover-bird-fly 2s ease-out forwards",
              "--end-dx": `${b.ex - b.sx}px`,
              "--end-dy": `${b.ey - b.sy}px`,
            } as React.CSSProperties
          }
          onAnimationEnd={() =>
            setHoverBirds((prev) => prev.filter((x) => x.id !== b.id))
          }
        >
          <Image
            src="/garden/bird.gif"
            alt=""
            width={112}
            height={64}
            unoptimized
          />
        </div>
      ))}

      <div className="garden-bottom-row">
        <div className="garden-bottom-stack">
          <MoodPill />
        </div>

        <div className="garden-filter-bar">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={
                "garden-filter-pill" + (activeFilter === f.key ? " active" : "")
              }
              onClick={() => setActiveFilter(f.key)}
            >
              <span
                className="garden-filter-dot"
                style={{
                  background:
                    f.color ??
                    "conic-gradient(var(--g-lotus), var(--g-gold), var(--g-sage), var(--g-lavender), var(--g-lotus))",
                }}
              />
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
