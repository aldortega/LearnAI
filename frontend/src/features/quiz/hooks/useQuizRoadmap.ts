import { useCallback } from "react";
import useSWR from "swr";

import type { ApiError } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";

import { quizApi } from "../api/quizApi";
import type { RoadmapOut } from "../types/quiz.types";


type Result = {
  roadmap: RoadmapOut | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
  reload: () => Promise<RoadmapOut | null>;
};

export function useQuizRoadmap(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<RoadmapOut | null>(
    notebookId ? swrKeys.roadmap(notebookId) : null,
    () => quizApi.getRoadmap(notebookId as string),
    {
      refreshInterval: (roadmap) => {
        if (!roadmap) {
          return 0;
        }

        const shouldPoll = roadmap.units.some((unit) =>
          unit.levels.some((level) => {
            const status = level.questions_status ?? "idle";
            return status === "generating";
          }),
        );

        return shouldPoll ? 3000 : 0;
      },
      revalidateOnFocus: false,
    },
  );
  const apiError = error as ApiError | undefined;
  const isNotFound = apiError?.status === 404;

  const reload = useCallback(async () => {
    if (!notebookId) {
      return null;
    }

    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId]);

  return {
    roadmap: data ?? null,
    isLoading: isLoading && !data,
    error: error && !isNotFound ? toNotebookErrorMessage(error) : null,
    isNotFound,
    reload,
  };
}
