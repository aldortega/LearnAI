import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartOut } from "../types/quickstart.types";
import { setQuickstart, useQuickstartStore } from "./useQuickstartStore";

type Result = {
  quickstart: QuickstartOut | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
  reload: () => Promise<QuickstartOut | null>;
};

export function useQuickstart(notebookId?: string): Result {
  const cachedQuickstart = useQuickstartStore(notebookId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const hasFetchedRef = useRef<string | null>(null);

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
      const data = await quickstartApi.getQuickstart(notebookId);
      setQuickstart(notebookId, data);
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

    if (cachedQuickstart || hasFetchedRef.current === notebookId) {
      return;
    }

    hasFetchedRef.current = notebookId;
    void reload();
  }, [notebookId, cachedQuickstart, reload]);

  useEffect(() => {
    if (notebookId && hasFetchedRef.current !== notebookId && !cachedQuickstart) {
      hasFetchedRef.current = null;
    }
  }, [notebookId, cachedQuickstart]);

  return {
    quickstart: cachedQuickstart,
    isLoading: isLoading && !cachedQuickstart,
    error,
    isNotFound,
    reload,
  };
}
