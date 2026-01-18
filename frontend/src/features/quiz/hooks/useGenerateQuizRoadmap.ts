import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { RoadmapOut } from "../types/quiz.types";

type Result = {
  generate: () => Promise<RoadmapOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateQuizRoadmap(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const generate = useCallback(async () => {
    if (!notebookId) return null;

    setIsGenerating(true);
    setError(null);

    try {
      return await quizApi.generateRoadmap(notebookId);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [notebookId]);

  return { generate, isGenerating, error, clearError };
}
