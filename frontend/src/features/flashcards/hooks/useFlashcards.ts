import { useCallback, useEffect, useRef, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { flashcardsApi } from "../api/flashcardsApi";
import type { FlashcardsOut } from "../types/flashcards.types";

const flashcardsCache = new Map<string, FlashcardsOut>();

type Result = {
  flashcards: FlashcardsOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<FlashcardsOut | null>;
};

export function useFlashcards(notebookId?: string): Result {
  const [flashcards, setFlashcards] = useState<FlashcardsOut | null>(() =>
    notebookId ? flashcardsCache.get(notebookId) ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(() =>
    notebookId ? !flashcardsCache.has(notebookId) : false,
  );
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!notebookId) {
      if (requestIdRef.current === requestId) {
        setFlashcards(null);
        setError(null);
        setIsLoading(false);
      }
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await flashcardsApi.getFlashcards(notebookId);
      flashcardsCache.set(notebookId, data);
      if (requestIdRef.current === requestId) {
        setFlashcards(data);
      }
      return data;
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(toNotebookErrorMessage(e));
      }
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) {
      requestIdRef.current += 1;
      setFlashcards(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cachedData = flashcardsCache.get(notebookId);
    if (cachedData) {
      setFlashcards(cachedData);
      setError(null);
      setIsLoading(false);
      return;
    }

    setFlashcards(null);
    setError(null);
    setIsLoading(true);
  }, [notebookId, reload]);

  return { flashcards, isLoading, error, reload };
}
