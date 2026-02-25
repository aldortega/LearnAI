import { useCallback, useMemo, useState } from "react";
import useSWR, { mutate as mutateSWR } from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
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

type QuickstartTopicDetailKey = ReturnType<typeof swrKeys.quickstartTopicDetail>;

function normalizeItemText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function useQuickstartTopicDetail(
  notebookId?: string,
  topicId?: string,
): Result {
  const [selected, setSelected] = useState<SelectedQuickstartDetail | null>(null);
  const requestKey = useMemo<QuickstartTopicDetailKey | null>(() => {
    if (!notebookId || !topicId || !selected) {
      return null;
    }

    return swrKeys.quickstartTopicDetail(
      notebookId,
      topicId,
      selected.itemType,
      selected.itemText,
    );
  }, [notebookId, selected, topicId]);
  const { data, error, isLoading } = useSWR<QuickstartTopicDetailOut>(
    requestKey,
    () => {
      return quickstartApi.getTopicDetail(notebookId as string, topicId as string, {
        item_type: selected?.itemType as QuickstartDetailItemType,
        item_text: selected?.itemText as string,
      });
    },
    {
      revalidateOnFocus: false,
    },
  );

  const clearDetail = useCallback(() => {
    setSelected(null);
  }, []);

  const loadDetail = useCallback(
    async (
      itemType: QuickstartDetailItemType,
      itemText: string,
    ): Promise<QuickstartTopicDetailOut | null> => {
      if (!notebookId || !topicId) return null;

      const normalizedItemText = normalizeItemText(itemText);
      if (!normalizedItemText) return null;

      const nextSelected = {
        itemType,
        itemText: normalizedItemText,
      } satisfies SelectedQuickstartDetail;
      setSelected(nextSelected);

      const cacheKey = swrKeys.quickstartTopicDetail(
        notebookId,
        topicId,
        itemType,
        normalizedItemText,
      );

      try {
        const result = await mutateSWR(
          cacheKey,
          quickstartApi.getTopicDetail(notebookId, topicId, {
            item_type: itemType,
            item_text: normalizedItemText,
          }),
          {
            revalidate: false,
          },
        );
        return result ?? null;
      } catch {
        return null;
      }
    },
    [notebookId, topicId],
  );

  return {
    detail: data ?? null,
    selected,
    isLoading,
    error: error ? toNotebookErrorMessage(error) : null,
    loadDetail,
    clearDetail,
  };
}
