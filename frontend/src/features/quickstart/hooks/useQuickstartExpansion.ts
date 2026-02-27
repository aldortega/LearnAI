import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartExpansionOut } from "../types/quickstart.types";

type Result = {
  expansion: QuickstartExpansionOut | null;
  isLoading: boolean;
  error: string | null;
  expand: () => Promise<QuickstartExpansionOut | null>;
  clearError: () => void;
};

export function useQuickstartExpansion(
  notebookId?: string,
  topicId?: string,
): Result {
  const [manualError, setManualError] = useState<string | null>(null);
  const requestKey = useMemo(
    () =>
      notebookId && topicId
        ? swrKeys.quickstartExpansion(notebookId, topicId)
        : null,
    [notebookId, topicId],
  );
  const {
    data: expansion,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<QuickstartExpansionOut>(
    requestKey,
    () => quickstartApi.expandTopic(notebookId as string, topicId as string),
    {
      revalidateOnMount: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
    },
  );

  const clearError = useCallback(() => setManualError(null), []);

  const expand = useCallback(async () => {
    if (!notebookId || !topicId) return null;
    if (expansion) return expansion;
    if (isLoading) return expansion ?? null;

    setManualError(null);

    try {
      const next = await mutate();
      return next ?? null;
    } catch (e) {
      setManualError(toNotebookErrorMessage(e));
      return null;
    }
  }, [notebookId, topicId, expansion, isLoading, mutate]);

  return {
    expansion: expansion ?? null,
    isLoading,
    error: manualError ?? (swrError ? toNotebookErrorMessage(swrError) : null),
    expand,
    clearError,
  };
}
