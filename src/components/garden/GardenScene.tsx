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

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useFetchJson } from "@/hooks/useFetchJson";
import { FlowerSprite } from "./FlowerSprite";
import { MoodPill } from "./MoodPill";
import type { FlowerSummary } from "./types";

// Lazy: the particle bundle only loads the first time night mode turns on,
// keeping it out of the initial garden payload.
const FirefliesLayer = dynamic(() => import("./FirefliesLayer"), {
  ssr: false,
});

const SPECIES_CATEGORY: Record<string, string> = {
  daisy: "self-awareness",
  lavender: "self-regulation",
  sunflower: "motivation",
  iris: "empathy",
  rose: "social-skills",
};

const FILTERS: { key: string; label: string; color?: string }[] = [
  { key: "all", label: "Бүгд" },
  { key: "self-awareness", label: "Өөрийгөө таних", color: "#d8c27a" },
  { key: "self-regulation", label: "Өөрийгөө зохицуулах", color: "#b6a8cf" },
  { key: "motivation", label: "Урам зориг", color: "#F9A825" },
  { key: "empathy", label: "Бусдыг ойлгох", color: "#9b8ec4" },
  { key: "social-skills", label: "Бусадтай харилцах", color: "#cf8aa0" },
];

const TIME_PRESETS = [
  {
    key: "golden",
    label: "Алтан цаг",
    icon: "☀️",
    filter: "none",
    tint: "transparent",
  },
  {
    key: "evening",
    label: "Үдэш",
    icon: "🌙",
    filter: "brightness(0.52) saturate(0.6) hue-rotate(215deg)",
    tint: "rgba(12, 28, 72, 0.42)",
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

// Night-mode drifters — cool blue/silver tones, only rendered in night mode
const NIGHT_DRIFTERS = [
  {
    left: "8%",
    color: "rgba(160,195,235,0.42)",
    w: 5,
    h: 8,
    angle: -15,
    dur: "26s",
    delay: "0s",
    dx: "60px",
    rot: "320deg",
  },
  {
    left: "22%",
    color: "rgba(200,225,250,0.35)",
    w: 4,
    h: 7,
    angle: 18,
    dur: "31s",
    delay: "-8s",
    dx: "-50px",
    rot: "280deg",
  },
  {
    left: "38%",
    color: "rgba(140,175,220,0.48)",
    w: 6,
    h: 10,
    angle: -22,
    dur: "22s",
    delay: "-4s",
    dx: "80px",
    rot: "350deg",
  },
  {
    left: "52%",
    color: "rgba(190,210,240,0.38)",
    w: 5,
    h: 8,
    angle: 10,
    dur: "28s",
    delay: "-12s",
    dx: "-40px",
    rot: "300deg",
  },
  {
    left: "66%",
    color: "rgba(165,200,238,0.44)",
    w: 4,
    h: 7,
    angle: -8,
    dur: "24s",
    delay: "-6s",
    dx: "55px",
    rot: "330deg",
  },
  {
    left: "79%",
    color: "rgba(210,230,255,0.32)",
    w: 6,
    h: 9,
    angle: 20,
    dur: "35s",
    delay: "-3s",
    dx: "-70px",
    rot: "290deg",
  },
  {
    left: "91%",
    color: "rgba(155,190,230,0.40)",
    w: 5,
    h: 8,
    angle: -12,
    dur: "27s",
    delay: "-9s",
    dx: "45px",
    rot: "360deg",
  },
  {
    left: "45%",
    color: "rgba(180,215,245,0.35)",
    w: 4,
    h: 7,
    angle: 25,
    dur: "32s",
    delay: "-16s",
    dx: "-35px",
    rot: "310deg",
  },
];

// Ambient petal/leaf drifters — viewport-fixed, never panned
const DRIFTERS = [
  {
    left: "4%",
    color: "#d8c27a",
    w: 7,
    h: 12,
    angle: -20,
    dur: "17s",
    delay: "0s",
    dx: "75px",
    rot: "380deg",
  },
  {
    left: "13%",
    color: "#b6a8cf",
    w: 5,
    h: 9,
    angle: 15,
    dur: "23s",
    delay: "-7s",
    dx: "-55px",
    rot: "300deg",
  },
  {
    left: "27%",
    color: "#cf8aa0",
    w: 6,
    h: 11,
    angle: -10,
    dur: "15s",
    delay: "-3s",
    dx: "90px",
    rot: "420deg",
  },
  {
    left: "41%",
    color: "#9aa87f",
    w: 5,
    h: 9,
    angle: 25,
    dur: "21s",
    delay: "-11s",
    dx: "40px",
    rot: "340deg",
  },
  {
    left: "56%",
    color: "#d8c27a",
    w: 7,
    h: 12,
    angle: -18,
    dur: "18s",
    delay: "-5s",
    dx: "-65px",
    rot: "400deg",
  },
  {
    left: "69%",
    color: "#cf8aa0",
    w: 5,
    h: 9,
    angle: 12,
    dur: "14s",
    delay: "-9s",
    dx: "70px",
    rot: "280deg",
  },
  {
    left: "82%",
    color: "#b6a8cf",
    w: 6,
    h: 11,
    angle: -22,
    dur: "25s",
    delay: "-2s",
    dx: "-48px",
    rot: "360deg",
  },
  {
    left: "94%",
    color: "#9aa87f",
    w: 5,
    h: 9,
    angle: 8,
    dur: "19s",
    delay: "-14s",
    dx: "55px",
    rot: "390deg",
  },
];

const EASE = 0.1; // how fast cur chases target (lower = floatier)
const FRICTION = 0.88; // inertia decay per frame

function clampX(x: number, worldPx: number, vpW: number): number {
  return Math.max(Math.min(0, vpW - worldPx), Math.min(0, x));
}

export function GardenScene({
  onOpenWorkshop,
  onOpenTaskTree,
  onOpenPond,
  onOpenFlowerChat,
  userName,
  nightMode = false,
  tutorialFlowerId,
  centerFlowerId,
  centerWorldXPct,
  refetchKey = 0,
}: {
  onOpenWorkshop: () => void;
  onOpenTaskTree: () => void;
  onOpenPond: () => void;
  onOpenFlowerChat: (flowerId: string) => void;
  userName: string;
  nightMode?: boolean;
  /** When set, marks that flower with data-tutorial-target="flower-planted". */
  tutorialFlowerId?: string;
  /** When set, pans the garden so this flower is horizontally centered. */
  centerFlowerId?: string;
  /** When set (0–100), pans the garden so this world-x% is centered. */
  centerWorldXPct?: number;
  /** Increment to trigger a refetch of the flower list (e.g. after planting). */
  refetchKey?: number;
}) {
  const reduceMotion = useReducedMotion();
  const {
    data: flowers,
    loading,
    error,
    refetch,
  } = useFetchJson<FlowerSummary[]>("/api/flowers");

  // Refetch whenever the parent increments refetchKey (e.g. after tutorial planting)
  useEffect(() => {
    if (refetchKey > 0) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchKey]);

  // Idle hint — fires after 5 s of no interaction once data is loaded
  const scheduleIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setIdleHint((flowers?.length ?? 0) === 0 ? "empty" : "explore");
    }, 5000);
  }, [flowers?.length]);

  useEffect(() => {
    if (loading) return;
    scheduleIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [loading, scheduleIdle]);

  function dismissIdle() {
    setIdleHint(null);
    scheduleIdle();
  }

  const [activeFilter, setActiveFilter] = useState("all");
  const [idleHint, setIdleHint] = useState<"explore" | "empty" | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      dismissIdle();
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

  // Tutorial: pan the world so the given flower is horizontally centered.
  // We set `target` and let the easing RAF loop glide there.
  useEffect(() => {
    if (!centerFlowerId) return;
    const flower = (flowers ?? []).find((f) => f.id === centerFlowerId);
    if (!flower) return;
    const vpW = vpRef.current?.clientWidth ?? window.innerWidth;
    const worldPx =
      worldW.current || Math.round(window.innerHeight * WORLD_RATIO);
    const desired = vpW / 2 - (flower.posX / 100) * worldPx;
    target.current = clampX(desired, worldPx, vpW);
  }, [centerFlowerId, flowers]);

  // Tutorial: pan to a fixed world-x% (e.g. the greenhouse, which sits off the
  // right edge at the default pan position).
  useEffect(() => {
    if (centerWorldXPct == null) return;
    const vpW = vpRef.current?.clientWidth ?? window.innerWidth;
    const worldPx =
      worldW.current || Math.round(window.innerHeight * WORLD_RATIO);
    const desired = vpW / 2 - (centerWorldXPct / 100) * worldPx;
    target.current = clampX(desired, worldPx, vpW);
  }, [centerWorldXPct]);

  // ---- pointer handlers ----

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dismissIdle();
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
    onOpenFlowerChat(flower.id);
  }

  function handleFlowerHover(flower: FlowerSummary) {
    const vpH = vpRef.current?.clientHeight ?? window.innerHeight;
    const sx = (flower.posX / 100) * worldW.current + cur.current;
    const sy = (flower.posY / 100) * vpH;

    // Aim for the Task Tree nav button; fall back to upper-center if not found
    const memBtn = document.querySelector<HTMLElement>('[data-nav="tasks"]');
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
    <motion.div
      ref={vpRef}
      className="garden-scene"
      style={{ cursor: "grab" }}
      data-tutorial-target="garden-scene"
      // #3 — whole scene fades + rises in on load.
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
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
          transition: "filter 1.5s ease",
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

      {/* #7 — fireflies: night-mode only, lazy-loaded, fade in/out with the
          lighting change. z-index 8 sits above the background/tint/drifters
          but below the flowers (z-index 10) and all UI. pointer-events:none
          so it never intercepts flower clicks. Skipped under reduced motion. */}
      <AnimatePresence>
        {nightMode && !reduceMotion && (
          <motion.div
            key="fireflies"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 8,
              pointerEvents: "none",
            }}
          >
            <FirefliesLayer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 2 — flowers + tree hotspot (same fx = 1, locked to the painting) */}
      <div ref={objRef} style={{ ...worldLayer, zIndex: 10 }}>
        {/* Invisible clickable region over the Task Tree */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "28%", top: "8%", width: "26%", height: "80%" }}
          onClick={onOpenTaskTree}
          aria-label="Даалгаврын мод нээх"
          title="Даалгаврын мод нээх"
          data-tutorial-target="task-tree"
        />

        {/* Invisible clickable region over the Greenhouse.
            Bounds hug the painted glass house (≈8–53% tall) rather than
            running down into the empty grass, so the tutorial spotlight —
            which centres on this element — lands on the building. */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "73%", top: "8%", width: "20%", height: "45%" }}
          onClick={onOpenWorkshop}
          aria-label="Хүлэмж нээх"
          title="Хүлэмж нээх"
          data-tutorial-target="greenhouse"
        />

        {/* Invisible clickable region over the Pond */}
        <button
          type="button"
          className="garden-tree-hotspot"
          style={{ left: "50%", top: "68%", width: "50%", height: "30%" }}
          onClick={onOpenPond}
          aria-label="Нуур нээх"
          title="Нуур нээх"
          data-tutorial-target="pond"
        />

        {(flowers ?? []).map((flower, i) => {
          const category = SPECIES_CATEGORY[flower.species.key] ?? "";
          const dimmed = activeFilter !== "all" && category !== activeFilter;
          return (
            <FlowerSprite
              key={flower.id}
              flower={flower}
              index={i}
              onSelect={selectFlower}
              onHoverStart={handleFlowerHover}
              dimmed={dimmed}
              nightMode={nightMode}
              tutorialTarget={
                tutorialFlowerId && flower.id === tutorialFlowerId
                  ? "flower-planted"
                  : undefined
              }
            />
          );
        })}
      </div>

      {/* Ambient petal drifters — viewport layer, never panned */}
      {(nightMode ? NIGHT_DRIFTERS : DRIFTERS).map((d, i) => (
        <div
          key={i}
          style={
            {
              position: "absolute",
              left: d.left,
              top: 0,
              width: d.w,
              height: d.h,
              borderRadius: "50% 50% 30% 70% / 50% 50% 60% 40%",
              background: d.color,
              opacity: 0,
              transform: `rotate(${d.angle}deg)`,
              pointerEvents: "none",
              zIndex: 6,
              "--drift-x": d.dx,
              "--drift-rot": d.rot,
              animation: `petal-drift ${d.dur} linear ${d.delay} infinite`,
            } as React.CSSProperties
          }
        />
      ))}

      {loading && (
        <p className="garden-hint">Таны цэцэрлэгийг ачааллаж байна…</p>
      )}
      {error && (
        <p className="garden-hint">Цэцэрлэгийг ачааллаж чадсангүй — {error}</p>
      )}

      {/* Idle contextual hints — only appear after 5 s of no interaction */}
      {idleHint === "empty" && (
        <button
          type="button"
          className="garden-hint garden-hint--idle"
          onClick={() => {
            dismissIdle();
            onOpenWorkshop();
          }}
        >
          Таны цэцэрлэг хоосон байна &nbsp;·&nbsp; эхний цэцгээ тарихын тулд
          Хүлэмж рүү очно уу →
        </button>
      )}
      {idleHint === "explore" && (
        <p className="garden-hint garden-hint--idle">
          ← Цэцэрлэгээ тойрон үзээрэй &nbsp;·&nbsp; яриа эхлүүлэхийн тулд цэцгэн
          дээр дарна уу
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
    </motion.div>
  );
}
