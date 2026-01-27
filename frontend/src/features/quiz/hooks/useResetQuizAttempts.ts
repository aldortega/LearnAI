import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { RoadmapLevelOut } from "../types/quiz.types";

type Result = {
  reset: (levelId: string) => Promise<RoadmapLevelOut | null>;
  isResetting: boolean;
  error: string | null;
  clearError: () => void;
};

export function useResetQuizAttempts(notebookId?: string): Result {
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const reset = useCallback(
    async (levelId: string) => {
      if (!notebookId) return null;

      setIsResetting(true);
      setError(null);

      try {
        return await quizApi.resetAttempts(notebookId, levelId);
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsResetting(false);
      }
    },
    [notebookId],
  );

  return { reset, isResetting, error, clearError };
}
