import { useCallback, useEffect, useRef, useState } from "react";

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
  const activeRunIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      activeRunIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    activeRunIdRef.current += 1;
    isRunningRef.current = false;
    setIsGenerating(false);
    setError(null);
  }, [notebookId]);

  const clearError = useCallback(() => setError(null), []);

  const startRun = useCallback(() => {
    const nextRunId = activeRunIdRef.current + 1;
    activeRunIdRef.current = nextRunId;
    return nextRunId;
  }, []);

  const isRunActive = useCallback(
    (runId: number) => isMountedRef.current && activeRunIdRef.current === runId,
    [],
  );

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: FlashcardsGenerationJobOut,
      runId: number,
    ): Promise<FlashcardsGenerationJobOut | null> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (!isRunActive(runId)) {
          return null;
        }

        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        if (!isRunActive(runId)) {
          return null;
        }

        latest = await flashcardsApi.getGenerationStatus(notebookId, jobId);
      }

      if (!isRunActive(runId)) {
        return null;
      }

      return {
        ...latest,
        status: "failed",
        error: "La generacion esta tardando mas de lo esperado.",
      };
    },
    [isRunActive, notebookId],
  );

  const generate = useCallback(
    async (options?: FlashcardsGenerateRequest) => {
      if (!notebookId) return null;
      if (isRunningRef.current) return null;

      isRunningRef.current = true;
      const runId = startRun();

      if (isMountedRef.current) {
        setIsGenerating(true);
        setError(null);
      }

      try {
        const job = await flashcardsApi.generate(notebookId, options);
        if (!isRunActive(runId)) {
          return null;
        }

        const result = await pollGeneration(job.job_id, job, runId);
        if (!result) {
          return null;
        }

        if (result.status === "failed") {
          if (isRunActive(runId)) {
            setError(result.error ?? "No se pudieron generar las flashcards.");
          }
          return null;
        }

        return result;
      } catch (e) {
        if (isRunActive(runId)) {
          setError(toNotebookErrorMessage(e));
        }
        return null;
      } finally {
        isRunningRef.current = false;

        if (isRunActive(runId)) {
          setIsGenerating(false);
        }
      }
    },
    [isRunActive, notebookId, pollGeneration, startRun],
  );

  const resumeLatest = useCallback(
    async (options?: { suppressFailedError?: boolean }) => {
      if (!notebookId) return null;
      if (isRunningRef.current) return null;

      isRunningRef.current = true;
      const runId = startRun();

      const suppressFailedError = options?.suppressFailedError ?? false;
      if (isMountedRef.current) {
        setError(null);
      }

      try {
        const job = await flashcardsApi.getLatestGeneration(notebookId);

        if (!isRunActive(runId)) {
          return null;
        }

        if (job.status === "done") {
          return job;
        }
        if (job.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
            setError(job.error ?? "No se pudieron generar las flashcards.");
          }
          return null;
        }
        if (isRunActive(runId)) {
          setIsGenerating(true);
        }

        const result = await pollGeneration(job.job_id, job, runId);
        if (!result) {
          return null;
        }

        if (result.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
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

        if (!suppressFailedError && isRunActive(runId)) {
          setError(toNotebookErrorMessage(e));
        }

        return null;
      } finally {
        isRunningRef.current = false;

        if (isRunActive(runId)) {
          setIsGenerating(false);
        }
      }
    },
    [isRunActive, notebookId, pollGeneration, startRun],
  );

  return { generate, resumeLatest, isGenerating, error, clearError };
}
