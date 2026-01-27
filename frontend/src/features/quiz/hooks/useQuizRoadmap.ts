import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";

import { quizApi } from "../api/quizApi";
import type { RoadmapOut } from "../types/quiz.types";
import { setRoadmap, useRoadmapStore } from "./useRoadmapStore";


type Result = {
  roadmap: RoadmapOut | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
  reload: () => Promise<RoadmapOut | null>;
};

export function useQuizRoadmap(notebookId?: string): Result {
  const cachedRoadmap = useRoadmapStore(notebookId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const hasFetchedRef = useRef<string | null>(null);
  const shouldPoll = useMemo(() => {
    if (!cachedRoadmap) return false;
    return cachedRoadmap.units.some((unit) =>
      unit.levels.some((level) => {
        const status = level.questions_status ?? "idle";
        return status === "generating";
      }),
    );
  }, [cachedRoadmap]);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setIsNotFound(false);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const data = await quizApi.getRoadmap(notebookId);
      setRoadmap(notebookId, data);
      return data;
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 404) {
        setIsNotFound(true);
        return null;
      }
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;

    // Skip if we already have cached data or already fetched
    if (cachedRoadmap || hasFetchedRef.current === notebookId) {
      return;
    }

    hasFetchedRef.current = notebookId;
    void reload();
  }, [notebookId, cachedRoadmap, reload]);

  // Reset hasFetchedRef when notebookId changes
  useEffect(() => {
    if (notebookId && hasFetchedRef.current !== notebookId && !cachedRoadmap) {
      hasFetchedRef.current = null;
    }
  }, [notebookId, cachedRoadmap]);

  useEffect(() => {
    if (!notebookId || !shouldPoll) return;
    const intervalId = window.setInterval(() => {
      void reload();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [notebookId, reload, shouldPoll]);

  return {
    roadmap: cachedRoadmap,
    isLoading: isLoading && !cachedRoadmap,
    error,
    isNotFound,
    reload,
  };
}
