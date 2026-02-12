import { useCallback, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type {
  QuizGenerateRequest,
  QuizGenerationJobOut,
} from "../types/quiz.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  generate: (options: QuizGenerateRequest) => Promise<QuizGenerationJobOut | null>;
  resumeLatest: () => Promise<QuizGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateQuizRoadmap(notebookId?: string): Result {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const pollGeneration = useCallback(
    async (
      jobId: string,
      initial: QuizGenerationJobOut,
    ): Promise<QuizGenerationJobOut> => {
      if (!notebookId) return initial;

      let latest = initial;
      const deadline = Date.now() + POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        if (latest.status === "done" || latest.status === "failed") {
          return latest;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        latest = await quizApi.getGenerationStatus(notebookId, jobId);
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
    async (options: QuizGenerateRequest) => {
      if (!notebookId) return null;

      setIsGenerating(true);
      setError(null);

      try {
        const job = await quizApi.generateRoadmap(notebookId, options);
        const result = await pollGeneration(job.job_id, job);

        if (result.status === "failed") {
          setError(result.error ?? "No se pudo generar el quiz.");
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

  const resumeLatest = useCallback(async () => {
    if (!notebookId) return null;

    setError(null);

    try {
      const job = await quizApi.getLatestGeneration(notebookId);
      if (!job) {
        return null;
      }
      if (job.status === "done") {
        return job;
      }
      if (job.status === "failed") {
        setError(job.error ?? "No se pudo generar el quiz.");
        return null;
      }

      setIsGenerating(true);
      const result = await pollGeneration(job.job_id, job);
      if (result.status === "failed") {
        setError(result.error ?? "No se pudo generar el quiz.");
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
