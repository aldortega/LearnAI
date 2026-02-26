import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { mindmapApi } from "../api/mindmapApi";
import type { MindmapOut } from "../types/mindmap.types";

type Result = {
  mindmap: MindmapOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<MindmapOut | null>;
};

export function useMindmap(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<MindmapOut>(
    notebookId ? swrKeys.mindmap(notebookId) : null,
    () => mindmapApi.getMindmap(notebookId as string),
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
    mindmap: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
