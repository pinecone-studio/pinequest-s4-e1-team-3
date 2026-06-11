"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "bloom_tutorial_complete";
const TOTAL_STEPS = 7; // steps 0–6

export interface TutorialContextType {
  tutorialActive: boolean;
  currentStep: number;
  tutorialComplete: boolean;
  advanceStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [tutorialActive, setTutorialActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // TODO: restore localStorage gate once onboarding is signed off
    // const done = localStorage.getItem(STORAGE_KEY) === "true";
    setTutorialActive(true);
    setReady(true);
  }, []);

  const advanceStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setTutorialActive(false);
    setTutorialComplete(true);
  }, []);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setTutorialActive(false);
    setTutorialComplete(true);
    setCurrentStep(0);
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        tutorialActive: ready && tutorialActive,
        currentStep,
        tutorialComplete,
        advanceStep,
        skipTutorial,
        completeTutorial,
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
