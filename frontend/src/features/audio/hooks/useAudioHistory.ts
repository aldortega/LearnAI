import { useCallback, useMemo } from "react";
import useSWR, { unstable_serialize, useSWRConfig } from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";
import type { PodcastOut } from "../types/audio.types";

type Result = {
  podcasts: PodcastOut[];
  isLoading: boolean;
  hasResolved: boolean;
  error: string | null;
  reload: () => Promise<PodcastOut[]>;
  removePodcast: (podcastId: string) => void;
};

export function useAudioHistory(notebookId?: string): Result {
  const { cache } = useSWRConfig();
  const fallbackData = useMemo<PodcastOut[] | undefined>(() => {
    if (!notebookId) return undefined;
    const cacheKey = unstable_serialize(swrKeys.audioHistory(notebookId));
    const cachedEntry = cache.get(cacheKey) as { data?: unknown } | undefined;
    const cachedData = cachedEntry?.data;
    return Array.isArray(cachedData) ? (cachedData as PodcastOut[]) : undefined;
  }, [cache, notebookId]);

  const { data, error, isLoading, mutate } = useSWR<PodcastOut[]>(
    notebookId ? swrKeys.audioHistory(notebookId) : null,
    async () => {
      const history = await audioApi.listPodcasts(notebookId as string);
      return history.items;
    },
    { fallbackData },
  );

  const reload = useCallback(async () => {
    if (!notebookId) return [];
    try {
      const next = await mutate();
      return next ?? [];
    } catch {
      return [];
    }
  }, [mutate, notebookId]);

  const removePodcast = useCallback(
    (podcastId: string) => {
      if (!notebookId) return;
      void mutate(
        (current) => (current ?? []).filter((item) => item.id !== podcastId),
        { revalidate: false },
      );
    },
    [mutate, notebookId],
  );

  return {
    podcasts: data ?? [],
    isLoading: isLoading && !data,
    hasResolved: data !== undefined || error !== undefined,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
    removePodcast,
  };
}
