import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type {
  ReportGenerateRequest,
  ReportGenerationJobOut,
} from "../types/reports.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  generate: (payload: ReportGenerateRequest) => Promise<ReportGenerationJobOut | null>;
  resumeLatest: () => Promise<ReportGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateReport(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestTokenRef = useRef(0);
  const isMountedRef = useRef(true);

  const clearError = useCallback(() => setError(null), []);
  const isTokenActive = useCallback(
    (token: number) =>
      isMountedRef.current && requestTokenRef.current === token,
    [],
  );

  useEffect(() => {
    requestTokenRef.current += 1;
    setIsGenerating(false);
  }, [notebookId]);

  useEffect(
    () => () => {
      isMountedRef.current = false;
      requestTokenRef.current += 1;
    },
    [],
  );

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: ReportGenerationJobOut,
      token: number,
    ): Promise<ReportGenerationJobOut> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (!isTokenActive(token)) {
          return latest;
        }
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (!isTokenActive(token)) {
          return latest;
        }
        latest = await reportsApi.getGenerationStatus(notebookId, jobId);
      }

      return {
        ...latest,
        status: "failed",
        error: "La generacion esta tardando mas de lo esperado.",
      };
    },
    [notebookId, isTokenActive],
  );

  const generate = useCallback(
    async (payload: ReportGenerateRequest) => {
      if (!notebookId) return null;

      const requestToken = requestTokenRef.current + 1;
      requestTokenRef.current = requestToken;
      setIsGenerating(true);
      setError(null);

      try {
        const job = await reportsApi.generate(notebookId, payload);
        const result = await pollGeneration(job.job_id, job, requestToken);
        if (!isTokenActive(requestToken)) {
          return null;
        }
        if (result.status === "failed") {
          setError(result.error ?? "No se pudo generar el informe.");
          return null;
        }
        return result;
      } catch (e) {
        if (!isTokenActive(requestToken)) {
          return null;
        }
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        if (isTokenActive(requestToken)) {
          setIsGenerating(false);
        }
      }
    },
    [notebookId, pollGeneration, isTokenActive],
  );

  const resumeLatest = useCallback(async () => {
    if (!notebookId) return null;

    const requestToken = requestTokenRef.current + 1;
    requestTokenRef.current = requestToken;
    setIsGenerating(true);
    setError(null);

    try {
      const job = await reportsApi.getLatestGeneration(notebookId);
      if (!isTokenActive(requestToken)) {
        return null;
      }
      if (job.status === "done") {
        return job;
      }
      if (job.status === "failed") {
        setError(job.error ?? "No se pudo generar el informe.");
        return null;
      }

      const result = await pollGeneration(job.job_id, job, requestToken);
      if (!isTokenActive(requestToken)) {
        return null;
      }
      if (result.status === "failed") {
        setError(result.error ?? "No se pudo generar el informe.");
        return null;
      }
      return result;
    } catch (e) {
      if (!isTokenActive(requestToken)) {
        return null;
      }
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 404) {
        return null;
      }
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      if (isTokenActive(requestToken)) {
        setIsGenerating(false);
      }
    }
  }, [notebookId, pollGeneration, isTokenActive]);

  return { generate, resumeLatest, isGenerating, error, clearError };
}
