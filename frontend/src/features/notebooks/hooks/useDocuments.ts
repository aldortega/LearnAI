import { useCallback, useEffect, useState } from "react";

import type { Document } from "../types/documents.types";
import { documentsApi } from "../api/documentsApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";
import { setNotebookDocuments } from "./useNotebookDocumentsStore";

type Result = {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useDocuments(notebookId?: string, enabled = true): Result {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId || !enabled) {
      if (!notebookId) {
        setDocuments([]);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await documentsApi.list(notebookId);
      setDocuments(data);
      setNotebookDocuments(notebookId, data);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, enabled]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [reload, enabled]);

  return { documents, isLoading, error, reload };
}
