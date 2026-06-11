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
import { DeskChatPanel } from "./DeskChatPanel";
import { WorkshopPanel } from "./WorkshopPanel";
import { BirdMessagesPanel } from "./BirdMessagesPanel";
import { TaskTreePanel } from "./TaskTreePanel";
import {
  TutorialProvider,
  useTutorial,
} from "@/components/tutorial/TutorialContext";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";

export type PanelKey =
  | "garden"
  | "workshop"
  | "pond"
  | "notes"
  | "birds"
  | "tasks";

// Public export: wraps the inner component with TutorialProvider so the
// inner component can call useTutorial() as a descendant.
export function GardenShell({ userName }: { userName: string }) {
  return (
    <TutorialProvider>
      <GardenShellContent userName={userName} />
    </TutorialProvider>
  );
}

// All the real logic lives here, inside the provider.
function GardenShellContent({ userName }: { userName: string }) {
  const [panel, setPanel] = useState<PanelKey>("garden");
  const [nightMode, setNightMode] = useState(false);
  const [selectedFlowerId, setSelectedFlowerId] = useState<
    string | undefined
  >();
  const [birdDot, setBirdDot] = useState(false);
  const [birdRefetch, setBirdRefetch] = useState(0);
  const [gardenRefetch, setGardenRefetch] = useState(0);
  const [expectingTask, setExpectingTask] = useState(false);
  const { user } = useUser();
  const panelRef = useRef(panel);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const { tutorialActive, currentStep, advanceStep } = useTutorial();

  // Global Ably subscription — lives for the full garden session, not just
  // while the bird messages panel is open.
  // We use a `mounted` guard so the async import doesn't race with cleanup
  // (React StrictMode runs effects twice in dev and cleans up between runs).
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    let ablyClient: { close(): void } | null = null;

    import("ably")
      .then(({ Realtime }) => {
        if (!mounted) return;
        ablyClient = new Realtime({ authUrl: "/api/ably-token" });
        const channel = (ablyClient as any).channels.get(`garden:${user.id}`);
        channel.subscribe("garden-update", () => {
          if (!mounted) return;
          // Always refresh the garden scene's flower list when garden-update fires
          setGardenRefetch((n) => n + 1);
          if (panelRef.current === "birds") {
            setBirdRefetch((n) => n + 1);
          } else {
            setBirdDot(true);
          }
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
      try {
        ablyClient?.close();
      } catch {}
    };
  }, [user?.id]);

  const close = () => setPanel("garden");

  function openFlowerChat(flowerId: string) {
    setSelectedFlowerId(flowerId);
    setPanel("notes");
    // Step 3: user clicked their planted flower → advance to Memory Tree step
    if (tutorialActive && currentStep === 3) advanceStep();
  }

  function openBirds() {
    setBirdDot(false);
    setPanel("birds");
  }

  function openWorkshop() {
    setPanel("workshop");
    // Step 1: user clicked the Greenhouse → advance to flower-picker step
    if (tutorialActive && currentStep === 1) advanceStep();
  }

  function openMemoryTree() {
    setPanel("tasks");
    if (tutorialActive && currentStep === 4) advanceStep();
  }

  function openPond() {
    setPanel("pond");
    if (tutorialActive && currentStep === 5) advanceStep();
  }

  // data-tutorial-step on the root element drives CSS glow animations
  // (see tutorial.css) without any React class manipulation.
  const tutorialStep = tutorialActive ? currentStep : undefined;

  return (
    <div className="garden-root" data-tutorial-step={tutorialStep}>
      <GardenScene
        onOpenWorkshop={openWorkshop}
        onOpenTaskTree={openMemoryTree}
        onOpenPond={openPond}
        onOpenFlowerChat={openFlowerChat}
        userName={userName}
        nightMode={nightMode}
        // Tutorial: highlight the newly-planted flower in the garden for step 3
        tutorialFlowerId={
          tutorialActive && currentStep === 3 ? selectedFlowerId : undefined
        }
        // Tutorial: refetch flowers after planting while in tutorial mode
        refetchKey={gardenRefetch}
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
            if (tutorialActive && currentStep === 2) {
              // Step 2 complete: stay in garden so user can see their flower (step 3).
              // Force an immediate flower refetch so the planted flower appears.
              setGardenRefetch((k) => k + 1);
              setPanel("garden");
              advanceStep();
            } else {
              setPanel("notes");
            }
          }}
        />
      )}
      {panel === "pond" && <PondPanel onClose={close} />}
      {panel === "notes" && (
        <DeskChatPanel
          onClose={close}
          flowerId={selectedFlowerId}
          onOpenTasks={() => {
            setExpectingTask(true);
            setPanel("tasks");
          }}
        />
      )}
      {panel === "birds" && (
        <BirdMessagesPanel onClose={close} refetchSignal={birdRefetch} />
      )}
      {panel === "tasks" && (
        <TaskTreePanel
          onClose={close}
          expectingTask={expectingTask}
          onTaskArrived={() => setExpectingTask(false)}
        />
      )}

      <TutorialOverlay panel={panel} />
    </div>
  );
}
