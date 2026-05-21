import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";
import type { PodcastDetailOut } from "../types/audio.types";

type Result = {
  podcast: PodcastDetailOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PodcastDetailOut | null>;
};

export function usePodcastDetail(
  notebookId?: string,
  podcastId?: string,
): Result {
  const { data, error, isLoading, mutate } = useSWR<PodcastDetailOut>(
    notebookId && podcastId
      ? swrKeys.podcastDetail(notebookId, podcastId)
      : null,
    () => audioApi.getPodcast(notebookId as string, podcastId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId || !podcastId) return null;
    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId, podcastId]);

  return {
    podcast: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
