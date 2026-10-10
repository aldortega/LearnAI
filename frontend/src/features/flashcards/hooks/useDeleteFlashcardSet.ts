import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { flashcardsApi } from "../api/flashcardsApi";

type Result = {
  deleteSet: (setId: string) => Promise<boolean>;
  isDeleting: boolean;
  error: string | null;
  clearError: () => void;
};

export function useDeleteFlashcardSet(notebookId?: string): Result {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteSet = useCallback(
    async (setId: string) => {
      if (!notebookId) return false;

      setIsDeleting(true);
      setError(null);

      try {
        await flashcardsApi.deleteSet(notebookId, setId);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [notebookId],
  );

  return { deleteSet, isDeleting, error, clearError };
}
