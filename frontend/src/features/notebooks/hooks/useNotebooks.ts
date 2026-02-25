import { useCallback, useEffect } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import type { Notebook } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  notebooks: Notebook[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useNotebooks(userId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<Notebook[]>(
    userId ? swrKeys.notebooks(userId) : null,
    () => notebooksApi.list(),
  );

  const reload = useCallback(async () => {
    if (!userId) {
      return;
    }

    await mutate();
  }, [mutate, userId]);

  useEffect(() => {
    const handleReload = () => {
      if (!userId) {
        return;
      }

      void mutate();
    };

    window.addEventListener("notebook-collaboration-changed", handleReload);
    return () =>
      window.removeEventListener("notebook-collaboration-changed", handleReload);
  }, [mutate, userId]);

  return {
    notebooks: data ?? [],
    isLoading: userId ? isLoading && !data : false,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
