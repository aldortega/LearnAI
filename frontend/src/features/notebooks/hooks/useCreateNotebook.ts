import { useCallback, useState } from "react";

import type { Notebook } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";
import type { NotebookCreate } from "../types/notebooks.types";

type Result = {
  createNotebook: (payload: NotebookCreate) => Promise<Notebook>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useCreateNotebook(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createNotebook = async (payload: NotebookCreate): Promise<Notebook> => {
    setIsLoading(true);
    setError(null);

    try {
      const notebook = await notebooksApi.create(payload);
      return notebook;
    } catch (e) {
      const msg = toNotebookErrorMessage(e);
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { createNotebook, isLoading, error, clearError };
}
