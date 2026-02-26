import { useCallback } from "react";
import useSWR from "swr";

import type { ApiError } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartOut } from "../types/quickstart.types";

type Result = {
  quickstart: QuickstartOut | null;
  isLoading: boolean;
  error: string | null;
  isNotFound: boolean;
  reload: () => Promise<QuickstartOut | null>;
};

export function useQuickstart(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<QuickstartOut>(
    notebookId ? swrKeys.quickstart(notebookId) : null,
    () => quickstartApi.getQuickstart(notebookId as string),
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
    quickstart: data ?? null,
    isLoading: isLoading && !data,
    error: error && !isNotFound ? toNotebookErrorMessage(error) : null,
    isNotFound,
    reload,
  };
}
