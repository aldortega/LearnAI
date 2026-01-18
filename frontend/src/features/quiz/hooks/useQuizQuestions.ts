import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { QuizQuestionOut } from "../types/quiz.types";

type Result = {
  questions: QuizQuestionOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useQuizQuestions(
  notebookId?: string,
  levelId?: string | null,
): Result {
  const [questions, setQuestions] = useState<QuizQuestionOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId || !levelId) {
      setQuestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await quizApi.listQuestions(notebookId, levelId);
      setQuestions(data);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, levelId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { questions, isLoading, error, reload };
}
