// ============================================
//  GardenTopNav.tsx
//
//  Floating top bar for the Garden experience: the "Bloom" brand
//  pill, a horizontal pill-nav for switching panels, and the
//  account cluster (notifications + avatar) on the right.
//
//  Pure presentation — it knows the list of panels that exist and
//  renders the active one as highlighted, but GardenShell owns the
//  actual panel state and switching logic. This split keeps "what
//  panels exist + how the bar looks" separate from "which one is
//  open right now", so adding a panel later only means adding one
//  entry to NAV_ITEMS.
// ============================================

"use client";

import { UserButton } from "@clerk/nextjs";
import type { PanelKey } from "./GardenShell";

const NAV_ITEMS: { key: PanelKey; label: string }[] = [
  { key: "garden", label: "Garden" },
  { key: "notes", label: "Chat" },
  { key: "pond", label: "Pond" },
  { key: "workshop", label: "Greenhouse" },
  { key: "memory", label: "Memory Tree" },
];

export function GardenTopNav({
  active,
  onSelect,
  nightMode,
  onToggleNight,
}: {
  active: PanelKey;
  onSelect: (key: PanelKey) => void;
  nightMode: boolean;
  onToggleNight: () => void;
}) {
  return (
    <header className="garden-topbar">
      <span className="garden-brand">
        <span className="garden-brand-mark" aria-hidden>
          ⚘
        </span>
        Bloom
      </span>

      <nav className="garden-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            data-nav={item.key}
            className={"garden-nav-pill" + (active === item.key ? " active" : "")}
            onClick={() => onSelect(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <span className="garden-topbar-spacer" />

      <div className="garden-topbar-right">
        <button
          type="button"
          className="garden-icon-pill"
          onClick={onToggleNight}
          aria-label={nightMode ? "Switch to day" : "Switch to night"}
        >
          {nightMode ? "☀️" : "🌙"}
        </button>
        <span className="garden-icon-pill" aria-hidden>
          🍃
        </span>
        <UserButton />
      </div>
    </header>
  );
}
