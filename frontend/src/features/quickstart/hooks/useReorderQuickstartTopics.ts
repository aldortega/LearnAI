import { useCallback, useState } from "react";
import { useSWRConfig } from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartOut } from "../types/quickstart.types";

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
  const { mutate } = useSWRConfig();
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

      const topicById = new Map(previousTopics.map((topic) => [topic.id, topic]));
      const reorderedTopics = topicIds
        .map((topicId) => topicById.get(topicId))
        .filter((topic): topic is QuickstartOut["topics"][number] => Boolean(topic));
      if (reorderedTopics.length !== previousTopics.length) {
        return false;
      }

      const optimisticQuickstart: QuickstartOut = {
        ...quickstart,
        topics: reorderedTopics,
      };

      setIsReordering(true);
      setError(null);
      try {
        await mutate(
          swrKeys.quickstart(notebookId),
          async (currentQuickstart?: QuickstartOut | null) => {
            await quickstartApi.reorderTopics(notebookId, { topic_ids: topicIds });

            if (!currentQuickstart) {
              return optimisticQuickstart;
            }

            return {
              ...currentQuickstart,
              topics: reorderedTopics,
            };
          },
          {
            optimisticData: optimisticQuickstart,
            rollbackOnError: true,
            revalidate: false,
          },
        );
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setIsReordering(false);
      }
    },
    [isReordering, mutate, notebookId, quickstart],
  );

  return {
    reorderTopics,
    isReordering,
    error,
    clearError,
  };
}
