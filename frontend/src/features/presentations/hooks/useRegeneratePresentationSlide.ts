import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationSlide } from "../types/presentations.types";

type Result = {
  regenerateSlide: (
    presentationId: string,
    slideIndex: number,
    prompt: string,
  ) => Promise<PresentationSlide | null>;
  isRegenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useRegeneratePresentationSlide(notebookId?: string): Result {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerateSlide = useCallback(
    async (presentationId: string, slideIndex: number, prompt: string) => {
      if (!notebookId || !presentationId || slideIndex < 1 || !prompt.trim()) return null;

      setIsRegenerating(true);
      setError(null);
      try {
        const result = await presentationsApi.regenerateSlide(
          notebookId,
          presentationId,
          slideIndex,
          {
            prompt: prompt.trim(),
          },
        );
        return result.slide;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsRegenerating(false);
      }
    },
    [notebookId],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    regenerateSlide,
    isRegenerating,
    error,
    clearError,
  };
}
