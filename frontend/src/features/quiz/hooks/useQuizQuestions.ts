import { useCallback, useRef } from "react";
import useSWR from "swr";

import type { ApiError } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
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

type FetchResult = {
  questions: QuizQuestionOut[];
  status: RoadmapQuestionStatus;
};

export function useQuizQuestions(
  notebookId?: string,
  levelId?: string | null,
): Result {
  const generationByKeyRef = useRef<
    Map<string, { triggered: boolean; pollStartedAt: number | null }>
  >(new Map());

  const key = notebookId && levelId ? `${notebookId}:${levelId}` : null;

  const fetcher = useCallback(async (): Promise<FetchResult> => {
    if (!notebookId || !levelId) {
      return { questions: [], status: "idle" };
    }

    const entry = generationByKeyRef.current.get(key as string) ?? {
      triggered: false,
      pollStartedAt: null,
    };

    if (!entry.triggered) {
      const generation = await quizApi.generateLevelQuestions(
        notebookId,
        levelId,
      );
      entry.triggered = true;
      generationByKeyRef.current.set(key as string, entry);

      if (generation.status === "failed") {
        throw new Error(
          generation.error ?? "No se pudieron generar preguntas.",
        );
      }
    }

    try {
      const result = await quizApi.listQuestions(notebookId, levelId);
      if (result.status === 202) {
        if (!entry.pollStartedAt) {
          entry.pollStartedAt = Date.now();
          generationByKeyRef.current.set(key as string, entry);
        }
        const elapsed = Date.now() - entry.pollStartedAt;
        if (elapsed > POLL_TIMEOUT_MS) {
          entry.pollStartedAt = null;
          generationByKeyRef.current.set(key as string, entry);
          throw new Error("La generacion esta tardando mas de lo esperado.");
        }
        return { questions: [], status: "generating" };
      }

      entry.pollStartedAt = null;
      generationByKeyRef.current.set(key as string, entry);
      return { questions: result.data ?? [], status: "ready" };
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 202) {
        return { questions: [], status: "generating" };
      }
      throw e;
    }
  }, [notebookId, levelId, key]);

  const { data, error, isLoading, mutate } = useSWR<FetchResult>(
    key ? swrKeys.quizQuestions(notebookId as string, levelId as string) : null,
    fetcher,
    {
      refreshInterval: (latest) =>
        latest?.status === "generating" ? POLL_INTERVAL_MS : 0,
      revalidateOnFocus: false,
    },
  );

  const reload = useCallback(async () => {
    if (!key) return;
    generationByKeyRef.current.set(key, {
      triggered: false,
      pollStartedAt: null,
    });
    try {
      await mutate();
    } catch {
      // consumers read `error`
    }
  }, [mutate, key]);

  return {
    questions: data?.questions ?? [],
    isLoading:
      (isLoading && data === undefined) || data?.status === "generating",
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
