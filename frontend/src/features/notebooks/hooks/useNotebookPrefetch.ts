import { useEffect, useSyncExternalStore } from "react";
import { preload } from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { flashcardsApi } from "../../flashcards/api/flashcardsApi";
import { mindmapApi } from "../../mindmap/api/mindmapApi";
import { chatApi } from "../../notebook-chat/api/chatApi";
import { presentationsApi } from "../../presentations/api/presentationsApi";
import { quickstartApi } from "../../quickstart/api/quickstartApi";
import { quizApi } from "../../quiz/api/quizApi";
import { reportsApi } from "../../reports/api/reportsApi";

const prefetchedNotebookIds = new Set<string>();
const prefetchPromiseByNotebookId = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

type Result = {
  isPrefetching: boolean;
};

function emitChange(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getPrefetchingSnapshot(notebookId?: string, enabled = false): boolean {
  if (!enabled || !notebookId || prefetchedNotebookIds.has(notebookId)) {
    return false;
  }

  return true;
}

export async function prefetchNotebookModes(notebookId: string): Promise<void> {
  await Promise.allSettled([
    preload(swrKeys.quickstart(notebookId), () =>
      quickstartApi.getQuickstart(notebookId),
    ),
    preload(swrKeys.roadmap(notebookId), () => quizApi.getRoadmap(notebookId)),
    preload(swrKeys.chatConversation(notebookId), () =>
      chatApi.getConversation(notebookId),
    ),
    preload(swrKeys.chatMessages(notebookId), () => chatApi.getMessages(notebookId)),
    preload(swrKeys.mindmap(notebookId), () => mindmapApi.getMindmap(notebookId)),
    preload(swrKeys.flashcards(notebookId), () =>
      flashcardsApi.getFlashcards(notebookId),
    ),
    preload(swrKeys.reportsConfig(notebookId), () => reportsApi.getConfig(notebookId)),
    preload(swrKeys.reportsHistory(notebookId), async () => {
      const history = await reportsApi.listReports(notebookId);
      return history.items;
    }),
    preload(swrKeys.presentationsConfig(notebookId), () =>
      presentationsApi.getConfig(notebookId),
    ),
    preload(swrKeys.presentationsHistory(notebookId), async () => {
      const history = await presentationsApi.listPresentations(notebookId);
      return history.items;
    }),
  ]);
}

function getOrCreatePrefetchPromise(notebookId: string): Promise<void> {
  const existingPromise = prefetchPromiseByNotebookId.get(notebookId);
  if (existingPromise) {
    return existingPromise;
  }

  const nextPromise = prefetchNotebookModes(notebookId).finally(() => {
    prefetchedNotebookIds.add(notebookId);
    prefetchPromiseByNotebookId.delete(notebookId);
    emitChange();
  });

  prefetchPromiseByNotebookId.set(notebookId, nextPromise);
  emitChange();
  return nextPromise;
}

export function useNotebookPrefetch(
  notebookId?: string,
  enabled = false,
): Result {
  const isPrefetching = useSyncExternalStore(
    subscribe,
    () => getPrefetchingSnapshot(notebookId, enabled),
    () => getPrefetchingSnapshot(notebookId, enabled),
  );

  useEffect(() => {
    if (!enabled || !notebookId) {
      return;
    }

    if (prefetchedNotebookIds.has(notebookId)) {
      return;
    }

    void getOrCreatePrefetchPromise(notebookId);
  }, [enabled, notebookId]);

  return { isPrefetching };
}
