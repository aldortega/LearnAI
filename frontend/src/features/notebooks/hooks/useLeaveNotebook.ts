import { useState } from "react";

import { collaborationApi } from "../api/collaborationApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  leaveNotebook: (notebookId: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useLeaveNotebook(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const leaveNotebook = async (notebookId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await collaborationApi.leaveNotebook(notebookId);
    } catch (e) {
      const msg = toNotebookErrorMessage(e);
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { leaveNotebook, isLoading, error, clearError };
}
