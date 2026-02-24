import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationOut } from "../types/presentations.types";

type Result = {
  presentation: PresentationOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PresentationOut | null>;
};

export function usePresentationDetail(
  notebookId?: string,
  presentationId?: string,
): Result {
  const [presentation, setPresentation] = useState<PresentationOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId || !presentationId) {
      setPresentation(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await presentationsApi.getPresentation(notebookId, presentationId);
      setPresentation(data);
      return data;
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 404) {
        setPresentation(null);
        return null;
      }
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, presentationId]);

  useEffect(() => {
    if (!notebookId || !presentationId) {
      setPresentation(null);
      return;
    }
    void reload();
  }, [notebookId, presentationId, reload]);

  return { presentation, isLoading, error, reload };
}
