import { useCallback, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { flashcardsApi } from "../api/flashcardsApi";
import type {
  FlashcardsGenerateRequest,
  FlashcardsGenerationJobOut,
} from "../types/flashcards.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: FlashcardsGenerationJobOut,
    ): Promise<FlashcardsGenerationJobOut> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        latest = await flashcardsApi.getGenerationStatus(notebookId, jobId);
      }

      return {
        ...latest,
        status: "failed",
        error: "La generacion esta tardando mas de lo esperado.",
      };
    },
    [notebookId],
  );

  const generate = useCallback(
    async (options?: FlashcardsGenerateRequest) => {
      if (!notebookId) return null;

      setIsGenerating(true);
      setError(null);

      try {
        const job = await flashcardsApi.generate(notebookId, options);
        const result = await pollGeneration(job.job_id, job);
        if (result.status === "failed") {
          setError(result.error ?? "No se pudieron generar las flashcards.");
          return null;
        }
        return result;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [notebookId, pollGeneration],
  );

  const resumeLatest = useCallback(
    async (options?: { suppressFailedError?: boolean }) => {
      if (!notebookId) return null;

      const suppressFailedError = options?.suppressFailedError ?? false;

      setError(null);
      setIsGenerating(true);

      try {
        const job = await flashcardsApi.getLatestGeneration(notebookId);
        if (job.status === "done") {
          return job;
        }
        if (job.status === "failed") {
          if (!suppressFailedError) {
            setError(job.error ?? "No se pudieron generar las flashcards.");
          }
          return null;
        }
        const result = await pollGeneration(job.job_id, job);
        if (result.status === "failed") {
          if (!suppressFailedError) {
            setError(result.error ?? "No se pudieron generar las flashcards.");
          }
          return null;
        }
        return result;
      } catch (e) {
        const apiError = e as ApiError | undefined;
        if (apiError?.status === 404) {
          return null;
        }
        if (!suppressFailedError) {
          setError(toNotebookErrorMessage(e));
        }
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [notebookId, pollGeneration],
  );

  return { generate, resumeLatest, isGenerating, error, clearError };
}
