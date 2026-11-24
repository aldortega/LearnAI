import { useCallback, useEffect, useState } from "react";

import type { DemoSourceStatus, DemoStudyMode, OnboardingStep } from "../types/onboarding.types";
import { DEMO_ANSWER } from "../utils/demoContent";
import { ONBOARDING_STEPS } from "../utils/onboardingSteps";

const CREATE_DELAY_MS = 900;
const UPLOAD_DELAY_MS = 500;
const PROCESSING_MS = 2200;
const ASK_DELAY_MS = 700;
const SEGMENT_MS = 450;
const STUDY_MODE_DELAY_MS = 600;

export type OnboardingDemo = {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isNotebookCreated: boolean;
  sourceStatus: DemoSourceStatus;
  isQuestionAsked: boolean;
  revealedSegments: number;
  studyMode: DemoStudyMode | null;
  next: () => void;
  back: () => void;
  goTo: (index: number) => void;
  selectStudyMode: (mode: DemoStudyMode) => void;
};

export function useOnboardingDemo(): OnboardingDemo {
  const [stepIndex, setStepIndex] = useState(0);
  const [isNotebookCreated, setIsNotebookCreated] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<DemoSourceStatus>("none");
  const [isQuestionAsked, setIsQuestionAsked] = useState(false);
  const [revealedSegments, setRevealedSegments] = useState(0);
  const [studyMode, setStudyMode] = useState<DemoStudyMode | null>(null);

  const step = ONBOARDING_STEPS[stepIndex];
  const lastIndex = ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    const timers: number[] = [];
    const schedule = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    if (step === "create" && !isNotebookCreated) {
      schedule(() => setIsNotebookCreated(true), CREATE_DELAY_MS);
    }
    if (step === "upload" && sourceStatus === "none") {
      schedule(() => setSourceStatus("processing"), UPLOAD_DELAY_MS);
    }
    if (sourceStatus === "processing") {
      schedule(() => setSourceStatus("done"), PROCESSING_MS);
    }
    if (step === "ask" && !isQuestionAsked) {
      schedule(() => {
        setIsQuestionAsked(true);
        setRevealedSegments(1);
      }, ASK_DELAY_MS);
    }
    if (isQuestionAsked && revealedSegments < DEMO_ANSWER.length) {
      schedule(() => setRevealedSegments((count) => count + 1), SEGMENT_MS);
    }
    if (step === "study-modes" && studyMode === null) {
      schedule(() => setStudyMode("quickstart"), STUDY_MODE_DELAY_MS);
    }

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [step, isNotebookCreated, sourceStatus, isQuestionAsked, revealedSegments, studyMode]);

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
    isNotebookCreated,
    sourceStatus,
    isQuestionAsked,
    revealedSegments,
    studyMode,
    next,
    back,
    goTo,
    selectStudyMode: setStudyMode,
  };
}
