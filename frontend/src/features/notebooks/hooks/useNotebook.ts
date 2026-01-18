import { useEffect, useState } from "react";

import { notebooksApi } from "../api/notebooksApi";
import { setNotebook, useNotebookStore } from "./useNotebookStore";

export function useNotebook(notebookId?: string) {
  const cachedNotebook = useNotebookStore(notebookId);
  const [isLoading, setIsLoading] = useState(!cachedNotebook);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notebookId) return;

    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const notebook = await notebooksApi.get(notebookId);
        if (isMounted) {
          setNotebook(notebookId, notebook);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error loading notebook");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [notebookId]);

  return {
    notebook: cachedNotebook,
    isLoading: isLoading && !cachedNotebook,
    error,
  };
}
