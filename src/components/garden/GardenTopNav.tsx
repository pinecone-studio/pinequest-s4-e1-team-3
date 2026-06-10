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

const NAV_ITEMS: { key: PanelKey; label: string; icon: string }[] = [
  { key: "garden",   label: "Garden",       icon: "🌿" },
  { key: "notes",    label: "Chat",         icon: "🌸" },
  { key: "pond",     label: "Pond",         icon: "🫧" },
  { key: "workshop", label: "Greenhouse",   icon: "🪴" },
  { key: "memory",   label: "Memory Tree",  icon: "🌳" },
];

export function GardenTopNav({
  active,
  onSelect,
  nightMode,
  onToggleNight,
  onOpenBirds,
  birdDot = false,
}: {
  active: PanelKey;
  onSelect: (key: PanelKey) => void;
  nightMode: boolean;
  onToggleNight: () => void;
  onOpenBirds: () => void;
  birdDot?: boolean;
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
            <span style={{ marginRight: 5, fontSize: 13, lineHeight: 1 }} aria-hidden>{item.icon}</span>
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
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", padding: "0 14px" }}
        >
          {nightMode ? "Day" : "Night"}
        </button>
        <button
          type="button"
          className="garden-icon-pill"
          onClick={onOpenBirds}
          aria-label="Bird messages"
          style={{ position: "relative" }}
        >
          🪶
          {birdDot && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#e05c5c",
                border: "1.5px solid #fff",
              }}
            />
          )}
        </button>
        <UserButton />
      </div>
    </header>
  );
}
