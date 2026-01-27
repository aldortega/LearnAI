import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { QuizAttemptOut } from "../types/quiz.types";

type Result = {
  attempts: QuizAttemptOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useQuizAttempts(
  notebookId?: string,
  levelId?: string | null,
): Result {
  const [attempts, setAttempts] = useState<QuizAttemptOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId || !levelId) {
      setAttempts([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await quizApi.listAttempts(notebookId, levelId);
      setAttempts(data);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      setAttempts([]);
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, levelId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { attempts, isLoading, error, reload };
}
