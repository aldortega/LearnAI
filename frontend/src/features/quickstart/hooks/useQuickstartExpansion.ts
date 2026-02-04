import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartExpansionOut } from "../types/quickstart.types";

type Result = {
  expansion: QuickstartExpansionOut | null;
  isLoading: boolean;
  error: string | null;
  expand: () => Promise<QuickstartExpansionOut | null>;
  clearError: () => void;
};

export function useQuickstartExpansion(
  notebookId?: string,
  topicId?: string,
): Result {
  const [expansion, setExpansion] = useState<QuickstartExpansionOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const expand = useCallback(async () => {
    if (!notebookId || !topicId) return null;
    if (expansion) return expansion;
    if (isLoading) return expansion;

    setIsLoading(true);
    setError(null);

    try {
      const result = await quickstartApi.expandTopic(notebookId, topicId);
      setExpansion(result);
      return result;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, topicId, expansion, isLoading]);

  return { expansion, isLoading, error, expand, clearError };
}
