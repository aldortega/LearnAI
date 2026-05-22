import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
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
  const { data, error, isLoading, mutate } = useSWR<QuizAttemptOut[]>(
    notebookId && levelId ? swrKeys.quizAttempts(notebookId, levelId) : null,
    () => quizApi.listAttempts(notebookId as string, levelId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId || !levelId) return;
    try {
      await mutate();
    } catch {
      // swallow; consumers read `error`
    }
  }, [mutate, notebookId, levelId]);

  return {
    attempts: data ?? [],
    isLoading: isLoading && data === undefined,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
