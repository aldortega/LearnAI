import { useEffect } from "react";
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

export function useNotebookPrefetch(notebookId?: string, enabled = false): void {
  useEffect(() => {
    if (!enabled || !notebookId || prefetchedNotebookIds.has(notebookId)) {
      return;
    }

    prefetchedNotebookIds.add(notebookId);
    void prefetchNotebookModes(notebookId);
  }, [enabled, notebookId]);
}
