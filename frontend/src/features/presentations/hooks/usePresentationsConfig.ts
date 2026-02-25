import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationConfigOut } from "../types/presentations.types";

type Result = {
  config: PresentationConfigOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PresentationConfigOut | null>;
};

export function usePresentationsConfig(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<PresentationConfigOut>(
    notebookId ? swrKeys.presentationsConfig(notebookId) : null,
    () => presentationsApi.getConfig(notebookId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId) {
      return null;
    }

    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId]);

  return {
    config: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
