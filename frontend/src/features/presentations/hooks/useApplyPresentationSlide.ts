import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationSlide } from "../types/presentations.types";

type Result = {
  applySlide: (
    presentationId: string,
    slideIndex: number,
    slide: PresentationSlide,
  ) => Promise<boolean>;
  isApplying: boolean;
  error: string | null;
  clearError: () => void;
};

export function useApplyPresentationSlide(notebookId?: string): Result {
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applySlide = useCallback(
    async (presentationId: string, slideIndex: number, slide: PresentationSlide) => {
      if (!notebookId || !presentationId || slideIndex < 1) return false;

      setIsApplying(true);
      setError(null);
      try {
        await presentationsApi.applySlide(notebookId, presentationId, slideIndex, {
          title: slide.title,
          subtitle: slide.subtitle ?? null,
          content_markdown: slide.content_markdown,
        });
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setIsApplying(false);
      }
    },
    [notebookId],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    applySlide,
    isApplying,
    error,
    clearError,
  };
}
