import { useSyncExternalStore } from "react";

import type { RoadmapOut } from "../types/quiz.types";

type StoreState = {
  roadmapByNotebookId: Map<string, RoadmapOut>;
};

const storeState: StoreState = {
  roadmapByNotebookId: new Map(),
};

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, RoadmapOut | null>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): RoadmapOut | null {
  if (!notebookId) {
    return null;
  }

  const roadmap = storeState.roadmapByNotebookId.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);

  if (cached === roadmap) {
    return cached;
  }

  snapshotCache.set(notebookId, roadmap);
  return roadmap;
}

export function setRoadmap(notebookId: string, roadmap: RoadmapOut) {
  storeState.roadmapByNotebookId.set(notebookId, roadmap);
  emitChange();
}

export function clearRoadmap(notebookId: string) {
  storeState.roadmapByNotebookId.delete(notebookId);
  snapshotCache.delete(notebookId);
  emitChange();
}

export function useRoadmapStore(notebookId?: string): RoadmapOut | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
