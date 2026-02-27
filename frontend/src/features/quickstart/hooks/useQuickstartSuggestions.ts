import { useCallback, useState } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartSuggestionsOut } from "../types/quickstart.types";

type Result = {
  suggestions: QuickstartSuggestionsOut | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadIfMissing: () => Promise<QuickstartSuggestionsOut | null>;
  reload: () => Promise<QuickstartSuggestionsOut | null>;
  removeSuggestion: (title: string) => void;
};

export function useQuickstartSuggestions(
  notebookId?: string,
  enabled = true,
): Result {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<QuickstartSuggestionsOut>(
    notebookId && enabled ? swrKeys.quickstartSuggestions(notebookId) : null,
    () => quickstartApi.getSuggestions(notebookId as string),
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
    },
  );

  const loadIfMissing = useCallback(async () => {
    if (!notebookId || !enabled) {
      return null;
    }

    if (data) {
      return data;
    }

    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [data, enabled, mutate, notebookId]);

  const reload = useCallback(async () => {
    if (!notebookId || !enabled) {
      return null;
    }

    setIsRefreshing(true);
    try {
      const next = await quickstartApi.getSuggestions(notebookId, true);
      await mutate(next, { revalidate: false });
      return next ?? null;
    } catch {
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [enabled, mutate, notebookId]);

  const removeSuggestion = useCallback(
    (title: string) => {
      if (!notebookId) return;

      const target = title.trim().toLowerCase();
      if (!target) {
        return;
      }

      void mutate(
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            suggestions: current.suggestions.filter(
              (item) => item.trim().toLowerCase() !== target,
            ),
          };
        },
        { revalidate: false },
      );
    },
    [mutate, notebookId],
  );

  return {
    suggestions: data ?? null,
    isLoading,
    isRefreshing,
    error: error ? toNotebookErrorMessage(error) : null,
    loadIfMissing,
    reload,
    removeSuggestion,
  };
}
