import { useCallback } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { flashcardsApi } from "../api/flashcardsApi";
import type {
  FlashcardsGenerateRequest,
  FlashcardsGenerationJobOut,
} from "../types/flashcards.types";

type Result = {
  generate: (
    options?: FlashcardsGenerateRequest,
  ) => Promise<FlashcardsGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<FlashcardsGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateFlashcards(notebookId?: string): Result {
  const base = useGenerationJob<
    FlashcardsGenerateRequest | undefined,
    FlashcardsGenerationJobOut
  >({
    notebookId,
    kind: "flashcards",
    generateRequest: flashcardsApi.generate,
    getLatestRequest: async (id) => flashcardsApi.getLatestGeneration(id),
    defaultFailedError: "No se pudieron generar las flashcards.",
    toErrorMessage: toNotebookErrorMessage,
  });

  const generate = useCallback(
    (options?: FlashcardsGenerateRequest) => base.generate(options),
    [base],
  );

  return {
    generate,
    resumeLatest: base.resumeLatest,
    isGenerating: base.isGenerating,
    error: base.error,
    clearError: base.clearError,
  };
}
