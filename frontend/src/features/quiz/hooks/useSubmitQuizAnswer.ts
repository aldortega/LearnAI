import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { QuizSubmitResponse } from "../types/quiz.types";

type Result = {
  submit: (questionId: string, selectedOptionId: string) => Promise<QuizSubmitResponse | null>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
};

export function useSubmitQuizAnswer(
  notebookId?: string,
  levelId?: string | null,
): Result {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(
    async (questionId: string, selectedOptionId: string) => {
      if (!notebookId || !levelId) return null;

      setIsSubmitting(true);
      setError(null);

      try {
        return await quizApi.submitAnswer(notebookId, levelId, {
          question_id: questionId,
          selected_option_id: selectedOptionId,
        });
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [notebookId, levelId],
  );

  return { submit, isSubmitting, error, clearError };
}
