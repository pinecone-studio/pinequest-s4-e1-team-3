"use client";

import { useRef, useEffect, useState } from "react";

interface LeafMarkProps {
  showWord?: boolean;
  word?: string;
}

export function LeafMark({ showWord = true, word = "Bloom" }: LeafMarkProps) {
  return (
    <span className="mark">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 21V11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 12.4C12 8.9 9 6.4 5.6 6.1 5.3 9.6 8 12.2 12 12.4Z" fill="currentColor" opacity={0.92} />
        <path d="M12 11.2C12 7.9 14.8 5.2 18.4 5 18.7 8.4 16 11 12 11.2Z" fill="currentColor" />
        <circle cx="12" cy="4.4" r="1.6" fill="currentColor" opacity={0.9} />
      </svg>
      {showWord && <span className="word">{word}</span>}
    </span>
  );
}

type MotionLevel = "alive" | "subtle" | "still";

interface RaysProps {
  level?: MotionLevel;
}

export function Rays({ level = "alive" }: RaysProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (level === "still") {
    return (
      <div className="rays show" style={{ opacity: 0.5 }} aria-hidden="true">
        <div className="ray" style={{ "--x": "24%", "--w": "180px", animation: "none", opacity: 0.6 } as React.CSSProperties} />
        <div className="ray" style={{ "--x": "46%", "--w": "120px", animation: "none", opacity: 0.5 } as React.CSSProperties} />
        <div className="ray" style={{ "--x": "64%", "--w": "150px", animation: "none", opacity: 0.55 } as React.CSSProperties} />
      </div>
    );
  }

  const beams = [
    { x: "14%", w: "200px", dur: "11s", delay: "0s" },
    { x: "30%", w: "120px", dur: "9s", delay: "-3s" },
    { x: "46%", w: "160px", dur: "13s", delay: "-1s" },
    { x: "62%", w: "110px", dur: "10s", delay: "-5s" },
    { x: "76%", w: "170px", dur: "12s", delay: "-2s" },
  ];
  const use = level === "subtle" ? beams.filter((_, i) => i % 2 === 0) : beams;

  return (
    <div className={`rays${show ? " show" : ""}`} aria-hidden="true">
      {use.map((b, i) => (
        <div
          key={i}
          className="ray"
          style={{ "--x": b.x, "--w": b.w, "--dur": b.dur, "--delay": b.delay } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

interface PetalsProps {
  level?: MotionLevel;
}

export function Petals({ level = "alive" }: PetalsProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (level === "still") return;
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduce) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let W = 0, H = 0, dpr = 1;
    const palette = ["#f6ecd6", "#e9d6b0", "#d9a6ab", "#cdbf9a", "#f3e3c4"];
    const count = level === "subtle" ? 16 : 34;

    interface Particle {
      x: number; y: number; r: number; vy: number; vx: number;
      drift: number; phase: number; sw: number; op: number; c: string;
    }

    let parts: Particle[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (initial: boolean): Particle => ({
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 20,
      r: 1.4 + Math.random() * 3.2,
      vy: -(0.18 + Math.random() * 0.5),
      vx: (Math.random() - 0.5) * 0.5,
      drift: 0.4 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      sw: 0.004 + Math.random() * 0.01,
      op: 0.28 + Math.random() * 0.55,
      c: palette[(Math.random() * palette.length) | 0],
    });

    resize();
    parts = Array.from({ length: count }, () => spawn(true));

    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.phase += p.sw;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.phase) * p.drift * 0.18;
        if (p.y < -20 || p.x < -30 || p.x > W + 30) Object.assign(p, spawn(false));
        ctx.globalAlpha = p.op;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.66, p.phase, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [level]);

  if (level === "still") return null;
  return <canvas ref={ref} className="petals" aria-hidden="true" />;
}

export function useParallax(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf: number;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 18;
      ty = (e.clientY / window.innerHeight - 0.5) * 12;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.transform = `scale(1.08) translate(${cx}px, ${cy}px)`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    window.addEventListener("pointermove", onMove);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", onMove); };
  }, [enabled]);
  return ref;
}
