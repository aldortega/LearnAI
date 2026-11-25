import { useCallback, useEffect, useState } from "react";

import type { DemoAskPhase, DemoSourceStatus, DemoStudyMode, OnboardingStep } from "../types/onboarding.types";
import { DEMO_NOTEBOOK } from "../utils/demoContent";
import { ONBOARDING_STEPS } from "../utils/onboardingSteps";
import { useAskDemo } from "./useAskDemo";
import { useUploadDemo } from "./useUploadDemo";

const TYPE_START_DELAY_MS = 500;
const TYPE_CHAR_MS = 110;
const CREATE_DELAY_MS = 600;
const NOTEBOOK_NAME_CHARS = Array.from(DEMO_NOTEBOOK.name);
const STUDY_MODE_DELAY_MS = 600;

export type OnboardingDemo = {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  typedNotebookName: string;
  isNotebookCreated: boolean;
  sourceStatus: DemoSourceStatus;
  sourceProgress: number;
  typedQuestion: string;
  askPhase: DemoAskPhase;
  revealedTokens: number;
  studyMode: DemoStudyMode | null;
  next: () => void;
  back: () => void;
  goTo: (index: number) => void;
  selectStudyMode: (mode: DemoStudyMode) => void;
};

export function useOnboardingDemo(): OnboardingDemo {
  const [stepIndex, setStepIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [isNotebookCreated, setIsNotebookCreated] = useState(false);
  const [studyMode, setStudyMode] = useState<DemoStudyMode | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const lastIndex = ONBOARDING_STEPS.length - 1;
  const upload = useUploadDemo(step === "upload");
  const ask = useAskDemo(step === "ask");

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    if (step === "create" && typedChars < NOTEBOOK_NAME_CHARS.length) {
      schedule(() => setTypedChars((count) => count + 1), typedChars === 0 ? TYPE_START_DELAY_MS : TYPE_CHAR_MS);
    }
    if (step === "create" && typedChars === NOTEBOOK_NAME_CHARS.length && !isNotebookCreated) {
      schedule(() => setIsNotebookCreated(true), CREATE_DELAY_MS);
    }
    if (step === "study-modes" && studyMode === null) {
      schedule(() => setStudyMode("quickstart"), STUDY_MODE_DELAY_MS);
    }

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [step, typedChars, isNotebookCreated, studyMode]);

  const goTo = useCallback(
    (index: number) => setStepIndex(Math.max(0, Math.min(lastIndex, index))),
    [lastIndex],
  );
  const next = useCallback(() => setStepIndex((i) => Math.min(lastIndex, i + 1)), [lastIndex]);
  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  return {
    step,
    stepIndex,
    totalSteps: ONBOARDING_STEPS.length,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === lastIndex,
    typedNotebookName: NOTEBOOK_NAME_CHARS.slice(0, typedChars).join(""),
    isNotebookCreated,
    sourceStatus: upload.status,
    sourceProgress: upload.progress,
    typedQuestion: ask.typedQuestion,
    askPhase: ask.phase,
    revealedTokens: ask.revealedTokens,
    studyMode,
    next,
    back,
    goTo,
    selectStudyMode: setStudyMode,
  };
}
