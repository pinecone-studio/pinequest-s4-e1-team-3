"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { TUTORIAL_STEPS } from "./steps";

const STORAGE_KEY = "bloom_tutorial_complete";
const TOTAL_STEPS = TUTORIAL_STEPS.length;
// Give the garden a beat to render before the first spotlight appears.
const FIRST_LOGIN_DELAY_MS = 1200;

/** Companion details published by the chat panel, used to fill the
 *  {companion} / {domain} tokens in the companion explanation step. */
export interface CompanionInfo {
  name: string;
  domain: string;
}

export interface TutorialContextType {
  tutorialActive: boolean;
  currentStep: number;
  tutorialComplete: boolean;
  companion: CompanionInfo | null;
  advanceStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  restartTutorial: () => void;
  setCompanion: (info: CompanionInfo) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tutorialActive, setTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [companion, setCompanionState] = useState<CompanionInfo | null>(null);
  const [ready, setReady] = useState(false);

  // First-login auto-start: if the user has never finished the tutorial,
  // begin it automatically a short beat after the garden mounts so the
  // scene has time to render before the first spotlight shows.
  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      // localStorage unavailable (SSR / privacy mode) — treat as not done
    }
    setReady(true);
    if (done) return;

    const t = setTimeout(() => {
      setCurrentStep(0);
      setTutorialActive(true);
    }, FIRST_LOGIN_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const completeTutorial = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setTutorialActive(false);
    setTutorialComplete(true);
  }, []);

  const skipTutorial = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    setTutorialActive(false);
    setTutorialComplete(true);
    setCurrentStep(0);
  }, []);

  // Replay from the very first step (Greenhouse) on demand.
  const restartTutorial = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "false");
    } catch {}
    setTutorialComplete(false);
    setCurrentStep(0);
    setTutorialActive(true);
  }, []);

  const setCompanion = useCallback((info: CompanionInfo) => {
    setCompanionState((prev) =>
      prev && prev.name === info.name && prev.domain === info.domain
        ? prev
        : info,
    );
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        tutorialActive: ready && tutorialActive,
        currentStep,
        tutorialComplete,
        companion,
        advanceStep,
        skipTutorial,
        completeTutorial,
        restartTutorial,
        setCompanion,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
