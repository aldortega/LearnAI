import { useCallback, useRef, useState } from "react";

import { toNotebookErrorMessage } from "../../../shared/lib/apiErrors";
import { flashcardsApi } from "../api/flashcardsApi";
import type { FlashcardOut } from "../types/flashcards.types";

type Result = {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  activeTerm: string;
  explanationMarkdown: string;
  openExplanation: (setId: string, card: FlashcardOut) => Promise<void>;
  closeExplanation: () => void;
};

export function useFlashcardExplanation(notebookId?: string): Result {
  const cacheRef = useRef<Map<string, string>>(new Map());
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState("");
  const [explanationMarkdown, setExplanationMarkdown] = useState("");

  const closeExplanation = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    setError(null);
  }, []);

  const openExplanation = useCallback(
    async (setId: string, card: FlashcardOut) => {
      if (!notebookId || isLoading) return;
      const cacheKey = `${notebookId}:${setId}:${card.id}`;
      const cachedExplanation = cacheRef.current.get(cacheKey);

      if (cachedExplanation) {
        setError(null);
        setActiveTerm(card.term);
        setIsLoading(false);
        setExplanationMarkdown(cachedExplanation);
        setIsOpen(true);
        return;
      }

      setError(null);
      setActiveTerm(card.term);
      setIsLoading(true);
      setExplanationMarkdown("");
      setIsOpen(true);

      try {
        const result = await flashcardsApi.explain(notebookId, setId, card.id);
        cacheRef.current.set(cacheKey, result.explanation_markdown);
        setExplanationMarkdown(result.explanation_markdown);
      } catch (err) {
        setError(toNotebookErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, notebookId],
  );

  return {
    isOpen,
    isLoading,
    error,
    activeTerm,
    explanationMarkdown,
    openExplanation,
    closeExplanation,
  };
}
