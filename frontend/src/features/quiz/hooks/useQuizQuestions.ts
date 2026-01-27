import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type {
  QuizQuestionOut,
  RoadmapQuestionStatus,
} from "../types/quiz.types";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180000;

type Result = {
  questions: QuizQuestionOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useQuizQuestions(
  notebookId?: string,
  levelId?: string | null,
): Result {
  const [questions, setQuestions] = useState<QuizQuestionOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RoadmapQuestionStatus>("idle");
  const statusRef = useRef<RoadmapQuestionStatus>("idle");
  const hasTriggeredGenerationRef = useRef(false);
  const pollStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const reload = useCallback(async () => {
    if (!notebookId || !levelId) {
      setQuestions([]);
      setError(null);
      setStatus("idle");
      hasTriggeredGenerationRef.current = false;
      pollStartedAtRef.current = null;
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!hasTriggeredGenerationRef.current || statusRef.current === "failed") {
      try {
        const generation = await quizApi.generateLevelQuestions(
          notebookId,
          levelId,
        );
        hasTriggeredGenerationRef.current = true;
        setStatus(generation.status);

        if (generation.status === "failed") {
          setError(generation.error ?? "No se pudieron generar preguntas.");
          setQuestions([]);
          pollStartedAtRef.current = null;
          setIsLoading(false);
          return;
        }
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        setQuestions([]);
        setStatus("failed");
        pollStartedAtRef.current = null;
        setIsLoading(false);
        return;
      }
    }

    let keepLoading = false;

    try {
      const result = await quizApi.listQuestions(notebookId, levelId);
      if (result.status === 202) {
        setQuestions([]);
        setStatus("generating");
        if (!pollStartedAtRef.current) {
          pollStartedAtRef.current = Date.now();
        }
        const elapsed = Date.now() - (pollStartedAtRef.current ?? Date.now());
        if (elapsed > POLL_TIMEOUT_MS) {
          setError("La generacion esta tardando mas de lo esperado.");
          setStatus("failed");
          pollStartedAtRef.current = null;
          setIsLoading(false);
          return;
        }
        keepLoading = true;
        return;
      }

      pollStartedAtRef.current = null;
      setQuestions(result.data ?? []);
      setStatus("ready");
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 202) {
        keepLoading = true;
        setStatus("generating");
      } else {
        setError(toNotebookErrorMessage(e));
        setStatus("failed");
        pollStartedAtRef.current = null;
      }
      setQuestions([]);
    } finally {
      if (!keepLoading) {
        setIsLoading(false);
      }
    }
  }, [notebookId, levelId]);

  useEffect(() => {
    if (!notebookId || !levelId) return;
    hasTriggeredGenerationRef.current = false;
    pollStartedAtRef.current = null;
    setStatus("idle");
    void reload();
  }, [notebookId, levelId, reload]);

  useEffect(() => {
    if (!notebookId || !levelId) return;
    if (status !== "generating") return;

    const timeoutId = window.setTimeout(() => {
      void reload();
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [notebookId, levelId, reload, status]);

  return { questions, isLoading, error, reload };
}
