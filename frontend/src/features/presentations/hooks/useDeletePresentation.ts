import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";

type Result = {
  deletePresentation: (presentationId: string) => Promise<boolean>;
  deletingPresentationId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDeletePresentation(notebookId?: string): Result {
  const [deletingPresentationId, setDeletingPresentationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deletePresentation = useCallback(
    async (presentationId: string) => {
      if (!notebookId) return false;

      setDeletingPresentationId(presentationId);
      setError(null);
      try {
        await presentationsApi.deletePresentation(notebookId, presentationId);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDeletingPresentationId(null);
      }
    },
    [notebookId],
  );

  return { deletePresentation, deletingPresentationId, error, clearError };
}
