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
import { AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { GardenTopNav } from "./GardenTopNav";
import { GardenScene } from "./GardenScene";
import { PondPanel } from "./PondPanel";
import { DeskChatPanel } from "./DeskChatPanel";
import { WorkshopPanel } from "./WorkshopPanel";
import { BirdMessagesPanel } from "./BirdMessagesPanel";
import { TaskTreePanel } from "./TaskTreePanel";
import { ReflectionPanel } from "./ReflectionPanel";
import { WeeklyCheckInBird } from "./WeeklyCheckInBird";
import {
  TutorialProvider,
  useTutorial,
} from "@/components/tutorial/TutorialContext";
import { TutorialOverlay } from "@/components/tutorial/TutorialOverlay";
import { TUTORIAL_STEPS } from "@/components/tutorial/steps";

export type PanelKey =
  | "garden"
  | "workshop"
  | "pond"
  | "notes"
  | "birds"
  | "tasks"
  | "reflection";

// World-x% to pan to when a garden-landmark tutorial step is active, so the
// landmark is centered on screen (the greenhouse/pond sit off the default view).
const TUTORIAL_PAN_PCT: Record<string, number> = {
  greenhouse: 83,
  "task-tree": 41,
  pond: 75,
};

// Public export: wraps the inner component with TutorialProvider so the
// inner component can call useTutorial() as a descendant.
export function GardenShell({
  userName,
  needsOnboarding = false,
}: {
  userName: string;
  needsOnboarding?: boolean;
}) {
  return (
    <TutorialProvider needsOnboarding={needsOnboarding}>
      <GardenShellContent
        userName={userName}
        needsOnboarding={needsOnboarding}
      />
    </TutorialProvider>
  );
}

// All the real logic lives here, inside the provider.
function GardenShellContent({
  userName,
  needsOnboarding,
}: {
  userName: string;
  needsOnboarding: boolean;
}) {
  const [panel, setPanel] = useState<PanelKey>("garden");
  const [nightMode, setNightMode] = useState(false);
  // When the chat panel is opened from the top-nav "Түүх" tab we show the
  // history list straight away; opening it from a flower shows the chat.
  const [notesStartHistory, setNotesStartHistory] = useState(false);
  // Forecast dropdown (MoodPill) open — the replay-tutorial button lifts above
  // the dropdown while it's open so the two don't overlap (bottom-left stack).
  const [moodOpen, setMoodOpen] = useState(false);
  const [selectedFlowerId, setSelectedFlowerId] = useState<
    string | undefined
  >();
  const [birdDot, setBirdDot] = useState(false);
  const [birdRefetch, setBirdRefetch] = useState(0);
  const [gardenRefetch, setGardenRefetch] = useState(0);
  const [expectingTask, setExpectingTask] = useState(false);
  const [taskConversationId, setTaskConversationId] = useState<string | null>(
    null,
  );
  const { user } = useUser();
  const panelRef = useRef(panel);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const {
    tutorialActive,
    tutorialComplete,
    currentStep,
    advanceStep,
    restartTutorial,
  } = useTutorial();

  // The active step's target — used to gate action-based advancement so the
  // wiring is robust to step reordering.
  const curTarget = tutorialActive
    ? TUTORIAL_STEPS[currentStep]?.target
    : undefined;

  // The flower-conversation created *during* the tutorial, so it (and any task
  // grown from it) can be deleted when the tutorial finishes or is skipped —
  // keeping the real garden clean. Ref: never needs to trigger a render.
  const tutorialConvId = useRef<string | null>(null);
  const cleanedUp = useRef(false);

  // During the tutorial, keep the on-screen panel in sync with the active
  // step's declared panel (greenhouse → chat → garden landmarks) without
  // fighting the interactive steps, whose user actions set the same panel.
  useEffect(() => {
    if (!tutorialActive) return;
    const step = TUTORIAL_STEPS[currentStep];
    if (step?.panel && step.panel !== panelRef.current) {
      setPanel(step.panel as PanelKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, tutorialActive]);

  // Reset cleanup tracking each time the tutorial (re)starts.
  const prevActiveRef = useRef(false);
  useEffect(() => {
    if (tutorialActive && !prevActiveRef.current) {
      tutorialConvId.current = null;
      cleanedUp.current = false;
    }
    prevActiveRef.current = tutorialActive;
  }, [tutorialActive]);

  // When the tutorial ends (finished OR skipped), delete anything it created.
  useEffect(() => {
    if (!tutorialComplete || cleanedUp.current) return;
    cleanedUp.current = true;
    setPanel("garden");
    const convId = tutorialConvId.current;
    if (!convId) return;
    (async () => {
      // Delete any task grown from the tutorial conversation first (its
      // conversation FK is SetNull, so it would otherwise survive), then the
      // conversation itself — which cascades the flower, messages and memories.
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const tasks = (await res.json()) as {
            id: string;
            conversationId: string | null;
          }[];
          for (const t of tasks) {
            if (t.conversationId === convId) {
              try {
                await fetch(`/api/tasks/${t.id}`, { method: "DELETE" });
              } catch {}
            }
          }
        }
      } catch {}
      // Delete the mood "stone" the pipeline created for this conversation. Its
      // conversation FK is SetNull too, so deleting the conversation would just
      // orphan the stone and leave it sitting in the pond for a brand-new user.
      try {
        const res = await fetch("/api/mood");
        if (res.ok) {
          const stones = (await res.json()) as {
            id: string;
            conversationId: string | null;
          }[];
          for (const s of stones) {
            if (s.conversationId === convId) {
              try {
                await fetch(`/api/mood?id=${s.id}`, { method: "DELETE" });
              } catch {}
            }
          }
        }
      } catch {}
      try {
        await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      } catch {}
      tutorialConvId.current = null;
      setGardenRefetch((k) => k + 1);
    })();
  }, [tutorialComplete]);

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
    setNotesStartHistory(false); // a flower → straight into its chat
    setPanel("notes");
    // flower-planted: clicking the flower opens chat → advance into the chat
    if (tutorialActive && curTarget === "flower-planted") advanceStep();
  }

  // Top-nav select: the "Түүх" (notes) tab opens the chat panel directly on its
  // history list; every other tab is a plain panel switch.
  function handleNavSelect(key: PanelKey) {
    if (key === "notes") setNotesStartHistory(true);
    setPanel(key);
  }

  function openBirds() {
    setBirdDot(false);
    setPanel("birds");
  }

  function openWorkshop() {
    setPanel("workshop");
    // greenhouse: clicking the Greenhouse → advance to flower-picker
    if (tutorialActive && curTarget === "greenhouse") advanceStep();
  }

  function openMemoryTree() {
    setPanel("tasks");
    // task-tree: clicking the tree opens the panel → explain the task tags.
    if (tutorialActive && curTarget === "task-tree") {
      setExpectingTask(true); // poll for the freshly-grown tutorial task
      advanceStep();
    }
  }

  function openPond() {
    setPanel("pond");
    // pond: clicking the pond opens the panel → explain rock throwing.
    if (tutorialActive && curTarget === "pond") advanceStep();
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
        onMoodOpenChange={setMoodOpen}
        // Tutorial: highlight the newly-planted flower in the garden
        tutorialFlowerId={
          tutorialActive && curTarget === "flower-planted"
            ? selectedFlowerId
            : undefined
        }
        // Tutorial: pan the garden so the planted flower is centered
        centerFlowerId={
          tutorialActive && curTarget === "flower-planted"
            ? selectedFlowerId
            : undefined
        }
        // Tutorial: pan to the active garden landmark (greenhouse / tree / pond)
        centerWorldXPct={
          tutorialActive && curTarget ? TUTORIAL_PAN_PCT[curTarget] : undefined
        }
        // Tutorial: refetch flowers after planting while in tutorial mode
        refetchKey={gardenRefetch}
      />
      <GardenTopNav
        active={panel}
        onSelect={handleNavSelect}
        nightMode={nightMode}
        onToggleNight={() => setNightMode((n) => !n)}
        onOpenBirds={openBirds}
        birdDot={birdDot}
      />

      {panel === "workshop" && (
        <WorkshopPanel
          onClose={close}
          onPlanted={(flowerId, conversationId) => {
            if (flowerId) setSelectedFlowerId(flowerId);
            if (tutorialActive && curTarget === "flower-picker") {
              // flower-picker complete: remember the created flower's
              // conversation for cleanup, then return to the garden so the
              // user can see + click their new flower. Force a refetch so the
              // planted flower appears immediately.
              if (conversationId) tutorialConvId.current = conversationId;
              setGardenRefetch((k) => k + 1);
              setPanel("garden");
              advanceStep();
            } else {
              setNotesStartHistory(false); // freshly planted → open its chat
              setPanel("notes");
            }
          }}
        />
      )}
      {panel === "pond" && <PondPanel onClose={close} />}
      {/* #4 — AnimatePresence keeps the desk chat mounted long enough to play
          its slide-out exit when the user closes it. */}
      <AnimatePresence>
        {panel === "notes" && (
          <DeskChatPanel
            key="desk-chat"
            onClose={close}
            flowerId={selectedFlowerId}
            startInHistory={notesStartHistory}
            onOpenTasks={(convId: string) => {
              setTaskConversationId(convId);
              setExpectingTask(true);
              setPanel("tasks");
            }}
          />
        )}
      </AnimatePresence>
      {panel === "birds" && (
        <BirdMessagesPanel onClose={close} refetchSignal={birdRefetch} />
      )}
      {panel === "tasks" && (
        <TaskTreePanel
          onClose={close}
          expectingTask={expectingTask}
          taskConversationId={taskConversationId}
          onTaskArrived={() => {
            setExpectingTask(false);
            setTaskConversationId(null);
          }}
        />
      )}
      {panel === "reflection" && <ReflectionPanel onClose={close} />}

      {/* Replay the tutorial — sits just above the mood pill (bottom-left),
          hidden while the tutorial is already running. */}
      {!tutorialActive && (
        <button
          type="button"
          onClick={restartTutorial}
          title="Заавар дахин үзэх"
          style={{
            position: "fixed",
            left: 28,
            // Lift above the forecast dropdown while it's open so they don't overlap.
            bottom: moodOpen ? 310 : 82,
            zIndex: 30,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(35,39,27,0.55)",
            color: "rgba(247,241,228,0.92)",
            border: "1px solid rgba(247,241,228,0.18)",
            borderRadius: 999,
            padding: "7px 13px",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Mulish', system-ui, sans-serif",
            letterSpacing: "0.02em",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.22)",
            transition: "bottom 0.22s ease",
          }}
        >
          <span aria-hidden style={{ fontSize: 13 }}>
            ↻
          </span>
          Заавар дахин үзэх
        </button>
      )}

      <WeeklyCheckInBird needsOnboarding={needsOnboarding} />
      <TutorialOverlay panel={panel} />
    </div>
  );
}
