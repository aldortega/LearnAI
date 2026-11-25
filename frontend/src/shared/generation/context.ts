import { createContext, useContext } from "react";

import type { GenerationJobBase, GenerationKind } from "./types";

export type TrackJobInput = {
  ownerId: string;
  notebookId: string;
  kind: GenerationKind;
  jobId: string;
  initialStatus?: GenerationJobBase["status"];
  initialError?: string | null;
};

export type GenerationMonitorContextValue = {
  trackJob: (input: TrackJobInput) => string;
  waitForJob: <TJob extends GenerationJobBase>(
    key: string,
  ) => Promise<TJob | null>;
  clearAllJobs: () => void;
};

export const GenerationMonitorContext =
  createContext<GenerationMonitorContextValue | null>(null);

export function useGenerationMonitor(): GenerationMonitorContextValue {
  const ctx = useContext(GenerationMonitorContext);
  if (!ctx) {
    throw new Error("useGenerationMonitor must be used within GenerationMonitorProvider");
  }
  return ctx;
}

export type GenerationActivityContextValue = {
  activeKeys: ReadonlySet<string>;
  completedKeys: ReadonlySet<string>;
  acknowledgeCompletion: (notebookId: string, kind: GenerationKind) => void;
};

export function buildActivityKey(notebookId: string, kind: GenerationKind): string {
  return `${notebookId}:${kind}`;
}

export const GenerationActivityContext =
  createContext<GenerationActivityContextValue | null>(null);

export function useGenerationActivity(): GenerationActivityContextValue {
  const ctx = useContext(GenerationActivityContext);
  if (!ctx) {
    throw new Error("useGenerationActivity must be used within GenerationMonitorProvider");
  }
  return ctx;
}
