import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartOut } from "../types/quickstart.types";
import { reorderQuickstartTopics, setQuickstart } from "./useQuickstartStore";

type Result = {
  reorderTopics: (topicIds: string[]) => Promise<boolean>;
  isReordering: boolean;
  error: string | null;
  clearError: () => void;
};

export function useReorderQuickstartTopics(
  notebookId: string | undefined,
  quickstart: QuickstartOut,
): Result {
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const reorderTopics = useCallback(
    async (topicIds: string[]) => {
      if (!notebookId || isReordering) return false;

      const previousTopics = quickstart.topics;
      const previousTopicIds = previousTopics.map((topic) => topic.id);
      if (previousTopicIds.length !== topicIds.length) return false;
      if (previousTopicIds.every((topicId, index) => topicId === topicIds[index])) {
        return true;
      }

      reorderQuickstartTopics(notebookId, topicIds);

      setIsReordering(true);
      setError(null);
      try {
        await quickstartApi.reorderTopics(notebookId, { topic_ids: topicIds });
        return true;
      } catch (e) {
        setQuickstart(notebookId, {
          ...quickstart,
          topics: previousTopics,
        });
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setIsReordering(false);
      }
    },
    [isReordering, notebookId, quickstart],
  );

  return {
    reorderTopics,
    isReordering,
    error,
    clearError,
  };
}
