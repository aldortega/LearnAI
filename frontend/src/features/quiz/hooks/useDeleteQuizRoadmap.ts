import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";

type Result = {
  deleteRoadmap: () => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
};

export function useDeleteQuizRoadmap(notebookId?: string): Result {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteRoadmap = useCallback(async () => {
    if (!notebookId) return false;

    setIsDeleting(true);
    setError(null);

    try {
      await quizApi.deleteRoadmap(notebookId);
      return true;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [notebookId]);

  return { deleteRoadmap, isDeleting, error, clearError };
}
