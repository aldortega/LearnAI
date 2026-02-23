import { useCallback, useEffect, useRef, useState } from "react";

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
  const [isLoading, setIsLoading] = useState(() => Boolean(notebookId));
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!notebookId) {
      if (requestIdRef.current === requestId) {
        setMindmap(null);
        setError(null);
        setIsLoading(false);
      }
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await mindmapApi.getMindmap(notebookId);
      if (requestIdRef.current === requestId) {
        setMindmap(data);
      }
      return data;
    } catch (e) {
      if (requestIdRef.current === requestId) {
        setError(toNotebookErrorMessage(e));
      }
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) {
      requestIdRef.current += 1;
      setMindmap(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void reload();
  }, [notebookId, reload]);

  return { mindmap, isLoading, error, reload };
}
