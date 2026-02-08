import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartSuggestionsOut } from "../types/quickstart.types";
import {
  clearQuickstartSuggestions,
  getQuickstartSuggestionsSnapshot,
  removeQuickstartSuggestion,
  setQuickstartSuggestions,
  useQuickstartSuggestionsStore,
} from "./useQuickstartSuggestionsStore";

type Result = {
  suggestions: QuickstartSuggestionsOut | null;
  isLoading: boolean;
  error: string | null;
  loadIfMissing: () => Promise<QuickstartSuggestionsOut | null>;
  reload: () => Promise<QuickstartSuggestionsOut | null>;
  removeSuggestion: (title: string) => void;
};

const initialLoadAttemptedByNotebook = new Set<string>();
const inFlightByNotebook = new Map<string, Promise<QuickstartSuggestionsOut | null>>();

export function useQuickstartSuggestions(
  notebookId?: string,
  enabled = true,
): Result {
  const suggestions = useQuickstartSuggestionsStore(notebookId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    if (!notebookId || !enabled) {
      if (notebookId) {
        clearQuickstartSuggestions(notebookId);
        initialLoadAttemptedByNotebook.delete(notebookId);
        inFlightByNotebook.delete(notebookId);
      }
      setError(null);
      return null;
    }

    const cached = getQuickstartSuggestionsSnapshot(notebookId);
    if (!force && cached) {
      return cached;
    }

    if (!force && initialLoadAttemptedByNotebook.has(notebookId)) {
      return cached;
    }

    const inFlight = inFlightByNotebook.get(notebookId);
    if (inFlight) {
      return inFlight;
    }

    if (!force) {
      initialLoadAttemptedByNotebook.add(notebookId);
    }

    const requestPromise = (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await quickstartApi.getSuggestions(notebookId);
        setQuickstartSuggestions(notebookId, data);
        return data;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsLoading(false);
        inFlightByNotebook.delete(notebookId);
      }
    })();

    inFlightByNotebook.set(notebookId, requestPromise);
    return requestPromise;
  }, [enabled, notebookId]);

  const loadIfMissing = useCallback(() => load(false), [load]);
  const reload = useCallback(() => load(true), [load]);

  const removeSuggestion = useCallback(
    (title: string) => {
      if (!notebookId) return;
      removeQuickstartSuggestion(notebookId, title);
    },
    [notebookId],
  );

  return { suggestions, isLoading, error, loadIfMissing, reload, removeSuggestion };
}
