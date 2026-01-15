import { useState } from "react";

import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  deleteNotebook: (notebookId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useDeleteNotebook(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const deleteNotebook = async (notebookId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await notebooksApi.remove(notebookId);
    } catch (e) {
      const msg = toNotebookErrorMessage(e);
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { deleteNotebook, isLoading, error, clearError };
}
