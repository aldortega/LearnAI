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

export function removeQuickstartTopic(notebookId: string, topicId: string) {
  const current = storeState.quickstartByNotebookId.get(notebookId);
  if (!current) return;

  const nextTopics = current.topics.filter((topic) => topic.id !== topicId);
  if (nextTopics.length === current.topics.length) return;

  storeState.quickstartByNotebookId.set(notebookId, {
    ...current,
    topics: nextTopics,
  });
  snapshotCache.delete(notebookId);
  emitChange();
}

export function reorderQuickstartTopics(notebookId: string, orderedTopicIds: string[]) {
  const current = storeState.quickstartByNotebookId.get(notebookId);
  if (!current) return;

  if (orderedTopicIds.length !== current.topics.length) return;

  const topicById = new Map(current.topics.map((topic) => [topic.id, topic]));
  const reorderedTopics = orderedTopicIds
    .map((topicId) => topicById.get(topicId))
    .filter((topic): topic is QuickstartTopic => Boolean(topic));

  if (reorderedTopics.length !== current.topics.length) return;

  const hasChanged = reorderedTopics.some(
    (topic, index) => topic.id !== current.topics[index]?.id,
  );
  if (!hasChanged) return;

  storeState.quickstartByNotebookId.set(notebookId, {
    ...current,
    topics: reorderedTopics,
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
