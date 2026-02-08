import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartTopic } from "../types/quickstart.types";

type Result = {
  addTopic: (title: string) => Promise<QuickstartTopic | null>;
  isAdding: boolean;
  error: string | null;
  clearError: () => void;
};

export function useAddQuickstartTopic(notebookId?: string): Result {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const addTopic = useCallback(
    async (title: string) => {
      if (!notebookId) return null;

      setIsAdding(true);
      setError(null);
      try {
        return await quickstartApi.addTopic(notebookId, title);
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsAdding(false);
      }
    },
    [notebookId],
  );

  return { addTopic, isAdding, error, clearError };
}
