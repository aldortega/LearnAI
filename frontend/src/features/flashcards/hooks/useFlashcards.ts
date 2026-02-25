import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { flashcardsApi } from "../api/flashcardsApi";
import type { FlashcardsOut } from "../types/flashcards.types";

type Result = {
  flashcards: FlashcardsOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<FlashcardsOut | null>;
};

export function useFlashcards(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<FlashcardsOut>(
    notebookId ? swrKeys.flashcards(notebookId) : null,
    () => flashcardsApi.getFlashcards(notebookId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId) {
      return null;
    }

    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId]);

  return {
    flashcards: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
