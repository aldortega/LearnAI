import { useCallback, useRef, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quickstartApi } from "../api/quickstartApi";
import type {
  QuickstartDetailItemType,
  QuickstartTopicDetailOut,
} from "../types/quickstart.types";

type SelectedQuickstartDetail = {
  itemType: QuickstartDetailItemType;
  itemText: string;
};

type Result = {
  detail: QuickstartTopicDetailOut | null;
  selected: SelectedQuickstartDetail | null;
  isLoading: boolean;
  error: string | null;
  loadDetail: (
    itemType: QuickstartDetailItemType,
    itemText: string,
  ) => Promise<QuickstartTopicDetailOut | null>;
  clearDetail: () => void;
};

function normalizeItemText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function buildKey(itemType: QuickstartDetailItemType, itemText: string): string {
  return `${itemType}:${normalizeItemText(itemText).toLowerCase()}`;
}

export function useQuickstartTopicDetail(
  notebookId?: string,
  topicId?: string,
): Result {
  const [detail, setDetail] = useState<QuickstartTopicDetailOut | null>(null);
  const [selected, setSelected] = useState<SelectedQuickstartDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, QuickstartTopicDetailOut>>(new Map());
  const requestIdRef = useRef(0);

  const clearDetail = useCallback(() => {
    requestIdRef.current += 1;
    setSelected(null);
    setDetail(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const loadDetail = useCallback(
    async (
      itemType: QuickstartDetailItemType,
      itemText: string,
    ): Promise<QuickstartTopicDetailOut | null> => {
      if (!notebookId || !topicId) return null;

      const normalizedItemText = normalizeItemText(itemText);
      if (!normalizedItemText) return null;

      const nextSelected: SelectedQuickstartDetail = {
        itemType,
        itemText: normalizedItemText,
      };
      setSelected(nextSelected);
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const cacheKey = buildKey(itemType, normalizedItemText);
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setError(null);
        setDetail(cached);
        setIsLoading(false);
        return cached;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await quickstartApi.getTopicDetail(notebookId, topicId, {
          item_type: itemType,
          item_text: normalizedItemText,
        });
        cacheRef.current.set(cacheKey, result);
        if (requestIdRef.current === requestId) {
          setDetail(result);
        }
        return result;
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
    },
    [notebookId, topicId],
  );

  return { detail, selected, isLoading, error, loadDetail, clearDetail };
}
