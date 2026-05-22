import { useCallback } from "react";
import useSWR from "swr";

import type { ApiError } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
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
  const { data, error, isLoading, mutate } = useSWR<PresentationOut | null>(
    notebookId && presentationId
      ? swrKeys.presentationDetail(notebookId, presentationId)
      : null,
    async () => {
      try {
        return await presentationsApi.getPresentation(
          notebookId as string,
          presentationId as string,
        );
      } catch (e) {
        const apiError = e as ApiError | undefined;
        if (apiError?.status === 404) {
          return null;
        }
        throw e;
      }
    },
  );

  const reload = useCallback(async () => {
    if (!notebookId || !presentationId) return null;
    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId, presentationId]);

  return {
    presentation: data ?? null,
    isLoading: isLoading && data === undefined,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
