import { useCallback, useEffect, useState } from "react";

import type { Notebook } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

const notebooksCacheByUserId = new Map<string, Notebook[]>();
const notebooksRequestByUserId = new Map<string, Promise<Notebook[]>>();

function getCachedNotebooks(userId?: string): Notebook[] | null {
  if (!userId) {
    return null;
  }

  return notebooksCacheByUserId.get(userId) ?? null;
}

async function listNotebooks(userId: string): Promise<Notebook[]> {
  const existingRequest = notebooksRequestByUserId.get(userId);
  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = notebooksApi.list().finally(() => {
    notebooksRequestByUserId.delete(userId);
  });

  notebooksRequestByUserId.set(userId, nextRequest);
  return nextRequest;
}

type Result = {
  notebooks: Notebook[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useNotebooks(userId?: string): Result {
  const [notebooks, setNotebooks] = useState<Notebook[]>(() => getCachedNotebooks(userId) ?? []);
  const [isLoading, setIsLoading] = useState(() => getCachedNotebooks(userId) === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = getCachedNotebooks(userId);
    setNotebooks(cached ?? []);
    setIsLoading(cached === null);
    setError(null);
  }, [userId]);

  const reload = useCallback(async () => {
    if (!userId) {
      setNotebooks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const cached = getCachedNotebooks(userId);
    const shouldShowLoader = cached === null;

    if (shouldShowLoader) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const data = await listNotebooks(userId);
      notebooksCacheByUserId.set(userId, data);
      setNotebooks(data);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
    } finally {
      if (shouldShowLoader) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const handleReload = () => {
      void reload();
    };

    window.addEventListener("notebook-collaboration-changed", handleReload);
    return () =>
      window.removeEventListener("notebook-collaboration-changed", handleReload);
  }, [reload]);

  return { notebooks, isLoading, error, reload };
}
