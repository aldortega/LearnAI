import { useCallback, useEffect, useState } from "react";

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
  const [mindmap, setMindmap] = useState<MindmapOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setMindmap(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await mindmapApi.getMindmap(notebookId);
      setMindmap(data);
      return data;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) {
      setMindmap(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    void reload();
  }, [notebookId, reload]);

  return { mindmap, isLoading, error, reload };
}
