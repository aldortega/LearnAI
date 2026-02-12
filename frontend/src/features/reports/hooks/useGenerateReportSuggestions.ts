import { useCallback, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportSuggestionsJobOut } from "../types/reports.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  generate: () => Promise<ReportSuggestionsJobOut | null>;
  resumeLatest: () => Promise<ReportSuggestionsJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateReportSuggestions(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: ReportSuggestionsJobOut,
    ): Promise<ReportSuggestionsJobOut> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        latest = await reportsApi.getSuggestionsGenerationStatus(notebookId, jobId);
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
      const job = await reportsApi.generateSuggestions(notebookId);
      const result = await pollGeneration(job.job_id, job);
      if (result.status === "failed") {
        setError(result.error ?? "No se pudieron generar sugerencias.");
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

  const resumeLatest = useCallback(async () => {
    if (!notebookId) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const job = await reportsApi.getLatestSuggestionsGeneration(notebookId);
      if (job.status === "done") {
        return job;
      }
      if (job.status === "failed") {
        setError(job.error ?? "No se pudieron generar sugerencias.");
        return null;
      }
      const result = await pollGeneration(job.job_id, job);
      if (result.status === "failed") {
        setError(result.error ?? "No se pudieron generar sugerencias.");
        return null;
      }
      return result;
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 404) {
        return null;
      }
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [notebookId, pollGeneration]);

  return { generate, resumeLatest, isGenerating, error, clearError };
}
