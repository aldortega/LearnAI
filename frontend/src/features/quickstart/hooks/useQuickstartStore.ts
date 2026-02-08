import { useSyncExternalStore } from "react";

import type { QuickstartOut, QuickstartTopic } from "../types/quickstart.types";

type StoreState = {
  quickstartByNotebookId: Map<string, QuickstartOut>;
};

const storeState: StoreState = {
  quickstartByNotebookId: new Map(),
};

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, QuickstartOut | null>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): QuickstartOut | null {
  if (!notebookId) {
    return null;
  }

  const quickstart = storeState.quickstartByNotebookId.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);

  if (cached === quickstart) {
    return cached;
  }

  snapshotCache.set(notebookId, quickstart);
  return quickstart;
}

export function setQuickstart(notebookId: string, quickstart: QuickstartOut) {
  storeState.quickstartByNotebookId.set(notebookId, quickstart);
  emitChange();
}

export function clearQuickstart(notebookId: string) {
  storeState.quickstartByNotebookId.delete(notebookId);
  snapshotCache.delete(notebookId);
  emitChange();
}

export function appendQuickstartTopic(notebookId: string, topic: QuickstartTopic) {
  const current = storeState.quickstartByNotebookId.get(notebookId);
  if (!current) return;

  const hasTopic = current.topics.some((item) => item.id === topic.id);
  if (hasTopic) return;

  storeState.quickstartByNotebookId.set(notebookId, {
    ...current,
    topics: [...current.topics, topic],
  });
  snapshotCache.delete(notebookId);
  emitChange();
}

export function useQuickstartStore(notebookId?: string): QuickstartOut | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
