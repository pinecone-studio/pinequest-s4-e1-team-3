// ============================================
//  GardenShell.tsx
//
//  Root client component for the Garden experience. Owns exactly
//  ONE piece of state — which panel is currently active — and
//  renders the top navigation + scene + whichever overlay matches it.
//
//  Every panel (Pond, Memory Tree, Desk, Workshop) fetches and
//  manages its own data; this file only decides WHICH one is on
//  screen, keeping the "what's open" logic in a single place
//  instead of scattered booleans across components.
// ============================================

"use client";

import { useState } from "react";
import { GardenTopNav } from "./GardenTopNav";
import { GardenScene } from "./GardenScene";
import { PondPanel } from "./PondPanel";
import { MemoryTreePanel } from "./MemoryTreePanel";
import { DeskChatPanel } from "./DeskChatPanel";
import { WorkshopPanel } from "./WorkshopPanel";

export type PanelKey = "garden" | "workshop" | "pond" | "memory" | "notes";

export function GardenShell({ userName }: { userName: string }) {
  const [panel, setPanel] = useState<PanelKey>("garden");
  const [nightMode, setNightMode] = useState(false);
  const close = () => setPanel("garden");

  return (
    <div className="garden-root">
      <GardenScene
        onOpenWorkshop={() => setPanel("workshop")}
        onOpenMemoryTree={() => setPanel("memory")}
        onOpenPond={() => setPanel("pond")}
        userName={userName}
        nightMode={nightMode}
      />
      <GardenTopNav
        active={panel}
        onSelect={setPanel}
        nightMode={nightMode}
        onToggleNight={() => setNightMode((n) => !n)}
      />

      {panel === "workshop" && (
        <WorkshopPanel
          onClose={close}
          onPlanted={() => setPanel("notes")}
        />
      )}
      {panel === "pond" && <PondPanel onClose={close} />}
      {panel === "memory" && <MemoryTreePanel onClose={close} />}
      {panel === "notes" && <DeskChatPanel onClose={close} />}
    </div>
  );
}
