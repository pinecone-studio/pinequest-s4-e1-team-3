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

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { GardenTopNav } from "./GardenTopNav";
import { GardenScene } from "./GardenScene";
import { PondPanel } from "./PondPanel";
import { MemoryTreePanel } from "./MemoryTreePanel";
import { DeskChatPanel } from "./DeskChatPanel";
import { WorkshopPanel } from "./WorkshopPanel";
import { BirdMessagesPanel } from "./BirdMessagesPanel";

export type PanelKey = "garden" | "workshop" | "pond" | "memory" | "notes" | "birds";

export function GardenShell({ userName }: { userName: string }) {
  const [panel, setPanel] = useState<PanelKey>("garden");
  const [nightMode, setNightMode] = useState(false);
  const [selectedFlowerId, setSelectedFlowerId] = useState<string | undefined>();
  const [birdDot, setBirdDot] = useState(false);    // red dot on feather button
  const [birdRefetch, setBirdRefetch] = useState(0); // increments to trigger panel refetch
  const [gardenRefetch, setGardenRefetch] = useState(0); // increments when a panel closes so GardenScene re-fetches flowers
  const { user } = useUser();
  const panelRef = useRef(panel);
  useEffect(() => { panelRef.current = panel; }, [panel]);

  // Global Ably subscription — lives for the full garden session, not just
  // while the bird messages panel is open.
  // We use a `mounted` guard so the async import doesn't race with cleanup
  // (React StrictMode runs effects twice in dev and cleans up between runs).
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    let ablyClient: { close(): void } | null = null;

    import("ably").then(({ Realtime }) => {
      if (!mounted) return; // cleaned up before the import resolved — bail out
      ablyClient = new Realtime({ authUrl: "/api/ably-token" });
      const channel = (ablyClient as any).channels.get(`garden:${user.id}`);
      channel.subscribe("garden-update", () => {
        if (!mounted) return;
        if (panelRef.current === "birds") {
          // Panel already open — tell it to refetch immediately
          setBirdRefetch((n) => n + 1);
        } else {
          // Panel closed — show the red dot
          setBirdDot(true);
        }
      });
    }).catch(() => {});

    return () => {
      mounted = false;
      try { ablyClient?.close(); } catch {}
    };
  }, [user?.id]);

  const close = () => {
    setPanel("garden");
    setGardenRefetch((n) => n + 1);
  };

  function openFlowerChat(flowerId: string) {
    setSelectedFlowerId(flowerId);
    setPanel("notes");
  }

  function openBirds() {
    setBirdDot(false); // clear the notification dot when the panel opens
    setPanel("birds");
  }

  return (
    <div className="garden-root">
      <GardenScene
        onOpenWorkshop={() => setPanel("workshop")}
        onOpenMemoryTree={() => setPanel("memory")}
        onOpenPond={() => setPanel("pond")}
        onOpenFlowerChat={openFlowerChat}
        userName={userName}
        nightMode={nightMode}
        refetchSignal={gardenRefetch}
      />
      <GardenTopNav
        active={panel}
        onSelect={setPanel}
        nightMode={nightMode}
        onToggleNight={() => setNightMode((n) => !n)}
        onOpenBirds={openBirds}
        birdDot={birdDot}
      />

      {panel === "workshop" && (
        <WorkshopPanel
          onClose={close}
          onPlanted={(flowerId) => {
            if (flowerId) setSelectedFlowerId(flowerId);
            setPanel("notes");
          }}
        />
      )}
      {panel === "pond" && <PondPanel onClose={close} />}
      {panel === "memory" && <MemoryTreePanel onClose={close} />}
      {panel === "notes" && <DeskChatPanel onClose={close} flowerId={selectedFlowerId} />}
      {panel === "birds" && <BirdMessagesPanel onClose={close} refetchSignal={birdRefetch} />}
    </div>
  );
}
