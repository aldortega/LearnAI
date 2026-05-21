import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";
import type { AudioConfigOut } from "../types/audio.types";

type Result = {
  config: AudioConfigOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<AudioConfigOut | null>;
};

export function useAudioConfig(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<AudioConfigOut>(
    notebookId ? swrKeys.audioConfig(notebookId) : null,
    () => audioApi.getConfig(notebookId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId) return null;
    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId]);

  return {
    config: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
