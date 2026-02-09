import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";

type Result = {
  deleteTopic: (topicId: string) => Promise<boolean>;
  deletingTopicId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDeleteQuickstartTopic(notebookId?: string): Result {
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteTopic = useCallback(
    async (topicId: string) => {
      if (!notebookId || !topicId) return false;

      setDeletingTopicId(topicId);
      setError(null);
      try {
        await quickstartApi.deleteTopic(notebookId, topicId);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDeletingTopicId((currentTopicId) =>
          currentTopicId === topicId ? null : currentTopicId,
        );
      }
    },
    [notebookId],
  );

  return { deleteTopic, deletingTopicId, error, clearError };
}
