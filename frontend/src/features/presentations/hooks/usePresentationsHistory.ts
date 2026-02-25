import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationOut } from "../types/presentations.types";

type Result = {
  presentations: PresentationOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PresentationOut[]>;
  removePresentation: (presentationId: string) => void;
};

export function usePresentationsHistory(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<PresentationOut[]>(
    notebookId ? swrKeys.presentationsHistory(notebookId) : null,
    async () => {
      const history = await presentationsApi.listPresentations(notebookId as string);
      return history.items;
    },
  );

  const reload = useCallback(async () => {
    if (!notebookId) {
      return [];
    }

    try {
      const next = await mutate();
      return next ?? [];
    } catch {
      return [];
    }
  }, [mutate, notebookId]);

  const removePresentation = useCallback(
    (presentationId: string) => {
      if (!notebookId) {
        return;
      }

      void mutate(
        (currentPresentations) =>
          (currentPresentations ?? []).filter((item) => item.id !== presentationId),
        { revalidate: false },
      );
    },
    [mutate, notebookId],
  );

  return {
    presentations: data ?? [],
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
    removePresentation,
  };
}
