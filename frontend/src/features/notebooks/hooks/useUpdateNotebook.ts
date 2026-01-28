import { useCallback, useState } from "react";

import type { Notebook } from "../types/notebooks.types";
import type { NotebookUpdate } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  updateNotebook: (notebookId: string, payload: NotebookUpdate) => Promise<Notebook>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useUpdateNotebook(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const updateNotebook = async (
    notebookId: string,
    payload: NotebookUpdate,
  ): Promise<Notebook> => {
    setIsLoading(true);
    setError(null);

    try {
      const notebook = await notebooksApi.update(notebookId, payload);
      return notebook;
    } catch (e) {
      const msg = toNotebookErrorMessage(e);
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateNotebook, isLoading, error, clearError };
}
