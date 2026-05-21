import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";

type Result = {
  deletePodcast: (podcastId: string) => Promise<boolean>;
  deletingPodcastId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDeletePodcast(notebookId?: string): Result {
  const [deletingPodcastId, setDeletingPodcastId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deletePodcast = useCallback(
    async (podcastId: string) => {
      if (!notebookId) return false;
      setDeletingPodcastId(podcastId);
      setError(null);
      try {
        await audioApi.deletePodcast(notebookId, podcastId);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDeletingPodcastId(null);
      }
    },
    [notebookId],
  );

  return { deletePodcast, deletingPodcastId, error, clearError };
}
