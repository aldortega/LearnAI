import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationOut } from "../types/presentations.types";

const presentationsHistoryCache = new Map<string, PresentationOut[]>();

type Result = {
  presentations: PresentationOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PresentationOut[]>;
  removePresentation: (presentationId: string) => void;
};

export function hasCachedPresentations(notebookId?: string): boolean {
  if (!notebookId) return false;
  const cachedPresentations = presentationsHistoryCache.get(notebookId);
  return Boolean(cachedPresentations && cachedPresentations.length > 0);
}

export function usePresentationsHistory(notebookId?: string): Result {
  const [presentations, setPresentations] = useState<PresentationOut[]>(() =>
    notebookId ? presentationsHistoryCache.get(notebookId) ?? [] : [],
  );
  const [isLoading, setIsLoading] = useState(() =>
    notebookId ? !presentationsHistoryCache.has(notebookId) : false,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setPresentations([]);
      setError(null);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await presentationsApi.listPresentations(notebookId);
      presentationsHistoryCache.set(notebookId, data.items);
      setPresentations(data.items);
      return data.items;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  const removePresentation = useCallback(
    (presentationId: string) => {
      setPresentations((prev) => {
        const next = prev.filter((item) => item.id !== presentationId);
        if (notebookId) {
          presentationsHistoryCache.set(notebookId, next);
        }
        return next;
      });
    },
    [notebookId],
  );

  useEffect(() => {
    if (!notebookId) {
      setPresentations([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cachedPresentations = presentationsHistoryCache.get(notebookId);
    if (cachedPresentations) {
      setPresentations(cachedPresentations);
      setError(null);
      setIsLoading(false);
      return;
    }

    setPresentations([]);
    void reload();
  }, [notebookId, reload]);

  return { presentations, isLoading, error, reload, removePresentation };
}
