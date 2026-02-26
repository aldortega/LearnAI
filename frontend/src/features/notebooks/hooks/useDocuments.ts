import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import type { Document } from "../types/documents.types";
import { documentsApi } from "../api/documentsApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useDocuments(notebookId?: string, enabled = true): Result {
  const { data, error, isLoading, mutate } = useSWR<Document[]>(
    notebookId ? swrKeys.documents(notebookId) : null,
    () => documentsApi.list(notebookId as string),
    {
      isPaused: () => !enabled,
    },
  );

  const reload = useCallback(async () => {
    if (!notebookId || !enabled) {
      return;
    }

    await mutate();
  }, [enabled, mutate, notebookId]);

  return {
    documents: data ?? [],
    isLoading: enabled ? isLoading && !data : false,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
