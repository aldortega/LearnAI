import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { flashcardsApi } from "../api/flashcardsApi";

type Result = {
  deleteFlashcards: () => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
};

export function useDeleteFlashcards(notebookId?: string): Result {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteFlashcards = useCallback(async () => {
    if (!notebookId) return false;

    setIsDeleting(true);
    setError(null);

    try {
      await flashcardsApi.deleteFlashcards(notebookId);
      return true;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [notebookId]);

  return { deleteFlashcards, isDeleting, error, clearError };
}
