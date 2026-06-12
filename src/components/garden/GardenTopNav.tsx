// ============================================
//  GardenTopNav.tsx
//
//  Floating top bar for the Garden experience: the "Bloom" brand
//  pill, a horizontal pill-nav with Lucide icons, and the account
//  cluster (notifications + avatar) on the right.
// ============================================

"use client";

import { UserButton } from "@clerk/nextjs";
import { Leaf, MessageCircle, Waves, Sprout, ListTree, Bird, Sun, Moon, HeartHandshake } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PanelKey } from "./GardenShell";

type NavItem = {
  key: PanelKey;
  label: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { key: "garden",   label: "Garden",     Icon: Leaf          },
  { key: "notes",    label: "Chat",       Icon: MessageCircle },
  { key: "pond",     label: "Pond",       Icon: Waves         },
  { key: "workshop", label: "Greenhouse", Icon: Sprout        },
  { key: "tasks",    label: "Task Tree",  Icon: ListTree      },
  { key: "reflection", label: "Check-in", Icon: HeartHandshake },
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
        {NAV_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            data-nav={key}
            className={"garden-nav-pill" + (active === key ? " active" : "")}
            onClick={() => onSelect(key)}
          >
            <Icon size={14} strokeWidth={2.2} aria-hidden />
            {label}
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
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
            padding: "0 14px",
            width: "auto",
            gap: 6,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          {nightMode ? (
            <><Sun size={13} strokeWidth={2.2} aria-hidden /> Day</>
          ) : (
            <><Moon size={13} strokeWidth={2.2} aria-hidden /> Night</>
          )}
        </button>

        <button
          type="button"
          className="garden-icon-pill"
          onClick={onOpenBirds}
          aria-label="Notifications"
          style={{ position: "relative" }}
        >
          <Bird size={20} strokeWidth={2} aria-hidden />
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
                border: "1.5px solid rgba(35,39,27,0.6)",
              }}
            />
          )}
        </button>

        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: 44, height: 44 },
            },
          }}
        />
      </div>
    </header>
  );
}
