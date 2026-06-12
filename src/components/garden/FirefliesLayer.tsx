// ============================================
//  FirefliesLayer.tsx
//
//  Night-mode-only ambient layer: glowing fireflies that drift over the
//  garden. Built on tsParticles (slim bundle). The <ParticlesProvider>
//  initialises the engine once and registers the slim bundle; <Particles>
//  then renders its canvas into this container (fullScreen disabled so it
//  stays inside the garden scene, not pinned to the viewport).
//
//  This module is loaded lazily (next/dynamic, ssr:false) from
//  GardenScene so the ~heavy particle bundle never ships with the initial
//  page — it only arrives the first time the user flips to night.
//
//  Positioning / z-index / pointer-events are owned by the wrapper in
//  GardenScene; here we only render the canvas, sized to fill its parent.
// ============================================

"use client";

import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine, ISourceOptions } from "@tsparticles/engine";

const OPTIONS: ISourceOptions = {
  fullScreen: { enable: false },
  background: { color: "transparent" },
  detectRetina: true,
  fpsLimit: 60,
  particles: {
    number: { value: 18 },
    color: { value: "#ffffa0" },
    opacity: {
      value: { min: 0.1, max: 0.7 },
      animation: { enable: true, speed: 0.6, sync: false },
    },
    size: { value: { min: 1.5, max: 3 } },
    move: {
      enable: true,
      speed: 0.6,
      direction: "none",
      random: true,
      outModes: { default: "bounce" },
    },
    shadow: { enable: true, color: "#ffffa0", blur: 8 },
  },
};

async function initEngine(engine: Engine) {
  await loadSlim(engine);
}

export default function FirefliesLayer() {
  return (
    <ParticlesProvider init={initEngine}>
      <Particles
        id="garden-fireflies"
        options={OPTIONS}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </ParticlesProvider>
  );
}
