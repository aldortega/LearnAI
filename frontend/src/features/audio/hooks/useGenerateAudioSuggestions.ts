import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";
import type { AudioSuggestionsJobOut } from "../types/audio.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  generate: () => Promise<AudioSuggestionsJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<AudioSuggestionsJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateAudioSuggestions(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastNotebookId, setLastNotebookId] = useState(notebookId);
  const activeRunIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const isRunningRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  if (notebookId !== lastNotebookId) {
    setLastNotebookId(notebookId);
    setIsGenerating(false);
    setError(null);
  }

  useEffect(() => {
    activeRunIdRef.current += 1;
    isRunningRef.current = false;
  }, [notebookId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isRunningRef.current = false;
      activeRunIdRef.current += 1;
    };
  }, []);

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
      initial: AudioSuggestionsJobOut,
      runId: number,
    ): Promise<AudioSuggestionsJobOut | null> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (!isRunActive(runId)) return null;
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (!isRunActive(runId)) return null;
        latest = await audioApi.getSuggestionsGenerationStatus(notebookId, jobId);
      }

      if (!isRunActive(runId)) return null;
      return {
        ...latest,
        status: "failed",
        error: "La generacion esta tardando mas de lo esperado.",
      };
    },
    [notebookId, isRunActive],
  );

  const generate = useCallback(async () => {
    if (!notebookId) return null;
    if (isRunningRef.current) return null;

    isRunningRef.current = true;
    const runId = startRun();

    if (isMountedRef.current) {
      setIsGenerating(true);
      setError(null);
    }

    try {
      const job = await audioApi.generateSuggestions(notebookId);
      if (!isRunActive(runId)) return null;

      const result = await pollGeneration(job.job_id, job, runId);
      if (!result) return null;

      if (result.status === "failed") {
        if (isRunActive(runId)) {
          setError(result.error ?? "No se pudieron generar sugerencias.");
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
  }, [notebookId, pollGeneration, isRunActive, startRun]);

  const resumeLatest = useCallback(
    async (options?: { suppressFailedError?: boolean }) => {
      if (!notebookId) return null;
      if (isRunningRef.current) return null;

      const suppressFailedError = options?.suppressFailedError ?? false;
      isRunningRef.current = true;
      const runId = startRun();

      if (isMountedRef.current) {
        setIsGenerating(true);
        setError(null);
      }

      try {
        const job = await audioApi.getLatestSuggestionsGeneration(notebookId);
        if (!isRunActive(runId)) return null;

        if (job.status === "done") return job;
        if (job.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
            setError(job.error ?? "No se pudieron generar sugerencias.");
          }
          return null;
        }

        const result = await pollGeneration(job.job_id, job, runId);
        if (!result) return null;

        if (result.status === "failed") {
          if (!suppressFailedError && isRunActive(runId)) {
            setError(result.error ?? "No se pudieron generar sugerencias.");
          }
          return null;
        }
        return result;
      } catch (e) {
        if (!isRunActive(runId)) return null;
        const apiError = e as ApiError | undefined;
        if (apiError?.status === 404) return null;
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
    [notebookId, pollGeneration, isRunActive, startRun],
  );

  return { generate, resumeLatest, isGenerating, error, clearError };
}
