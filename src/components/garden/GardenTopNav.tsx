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

import type { PanelKey } from "./GardenShell";

const NAV_ITEMS: { key: PanelKey; label: string }[] = [
  { key: "garden", label: "Garden" },
  { key: "pond", label: "Pond" },
  { key: "workshop", label: "Greenhouse" },
  { key: "memory", label: "Memory Tree" },
  { key: "notes", label: "Botanist's Desk" },
];

export function GardenTopNav({
  active,
  onSelect,
  userName,
}: {
  active: PanelKey;
  onSelect: (key: PanelKey) => void;
  userName: string;
}) {
  const initial = userName ? userName.trim().charAt(0).toUpperCase() : "B";

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
            className={"garden-nav-pill" + (active === item.key ? " active" : "")}
            onClick={() => onSelect(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <span className="garden-topbar-spacer" />

      <div className="garden-topbar-right">
        <span className="garden-icon-pill" aria-hidden>
          🍃
        </span>
        <span className="garden-avatar" title={userName || "Your garden"}>
          {initial}
        </span>
      </div>
    </header>
  );
}
