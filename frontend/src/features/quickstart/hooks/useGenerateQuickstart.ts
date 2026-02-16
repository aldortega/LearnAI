import { useCallback, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartGenerationJobOut } from "../types/quickstart.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  generate: () => Promise<QuickstartGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<QuickstartGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateQuickstart(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: QuickstartGenerationJobOut,
    ): Promise<QuickstartGenerationJobOut> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        latest = await quickstartApi.getGenerationStatus(notebookId, jobId);
      }

      return {
        ...latest,
        status: "failed",
        error: "La generacion esta tardando mas de lo esperado.",
      };
    },
    [notebookId],
  );

  const generate = useCallback(async () => {
    if (!notebookId) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const job = await quickstartApi.generateQuickstart(notebookId);
      const result = await pollGeneration(job.job_id, job);

      if (result.status === "failed") {
        setError(result.error ?? "No se pudo generar el inicio rapido.");
        return null;
      }

      return result;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [notebookId, pollGeneration]);

  const resumeLatest = useCallback(
    async (options?: { suppressFailedError?: boolean }) => {
      if (!notebookId) return null;

      const suppressFailedError = options?.suppressFailedError ?? false;

      try {
        const job = await quickstartApi.getLatestGeneration(notebookId);
        if (job.status === "done") {
          setError(null);
          return job;
        }
        if (job.status === "failed") {
          if (!suppressFailedError) {
            setError(job.error ?? "No se pudo generar el inicio rapido.");
          }
          return null;
        }

        setIsGenerating(true);
        setError(null);
        const result = await pollGeneration(job.job_id, job);
        if (result.status === "failed") {
          if (!suppressFailedError) {
            setError(result.error ?? "No se pudo generar el inicio rapido.");
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
