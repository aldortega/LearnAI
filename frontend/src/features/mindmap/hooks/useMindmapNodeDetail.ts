import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { mindmapApi } from "../api/mindmapApi";

type Result = {
  getDetail: (nodeId: string) => Promise<string | null>;
  getCachedDetail: (nodeId: string) => string | null;
  isNodeLoading: (nodeId: string) => boolean;
  getNodeError: (nodeId: string) => string | null;
  clearNodeError: (nodeId: string) => void;
  clearAll: () => void;
};

export function useMindmapNodeDetail(notebookId?: string): Result {
  const [detailByNodeId, setDetailByNodeId] = useState<Record<string, string>>({});
  const [loadingByNodeId, setLoadingByNodeId] = useState<Record<string, boolean>>({});
  const [errorByNodeId, setErrorByNodeId] = useState<Record<string, string>>({});

  const clearAll = useCallback(() => {
    setDetailByNodeId({});
    setLoadingByNodeId({});
    setErrorByNodeId({});
  }, []);

  useEffect(() => {
    clearAll();
  }, [notebookId, clearAll]);

  const getCachedDetail = useCallback(
    (nodeId: string) => detailByNodeId[nodeId] ?? null,
    [detailByNodeId],
  );

  const isNodeLoading = useCallback(
    (nodeId: string) => Boolean(loadingByNodeId[nodeId]),
    [loadingByNodeId],
  );

  const getNodeError = useCallback(
    (nodeId: string) => errorByNodeId[nodeId] ?? null,
    [errorByNodeId],
  );

  const clearNodeError = useCallback((nodeId: string) => {
    setErrorByNodeId((previous) => {
      if (!previous[nodeId]) return previous;
      const next = { ...previous };
      delete next[nodeId];
      return next;
    });
  }, []);

  const getDetail = useCallback(
    async (nodeId: string) => {
      if (!notebookId) return null;
      const cached = detailByNodeId[nodeId];
      if (cached) return cached;

      setLoadingByNodeId((previous) => ({ ...previous, [nodeId]: true }));
      setErrorByNodeId((previous) => {
        if (!previous[nodeId]) return previous;
        const next = { ...previous };
        delete next[nodeId];
        return next;
      });

      try {
        const detail = await mindmapApi.getNodeDetail(notebookId, nodeId);
        setDetailByNodeId((previous) => ({
          ...previous,
          [nodeId]: detail.explanation,
        }));
        return detail.explanation;
      } catch (e) {
        setErrorByNodeId((previous) => ({
          ...previous,
          [nodeId]: toNotebookErrorMessage(e),
        }));
        return null;
      } finally {
        setLoadingByNodeId((previous) => ({ ...previous, [nodeId]: false }));
      }
    },
    [detailByNodeId, notebookId],
  );

  return {
    getDetail,
    getCachedDetail,
    isNodeLoading,
    getNodeError,
    clearNodeError,
    clearAll,
  };
}
