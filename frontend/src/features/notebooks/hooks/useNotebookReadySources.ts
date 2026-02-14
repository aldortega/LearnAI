import { useEffect, useMemo } from "react";

import { useDocuments } from "./useDocuments";
import { useNotebookDocumentsStore } from "./useNotebookDocumentsStore";

const readySourcesCache = new Map<string, boolean>();

type Result = {
  hasReadySources: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useNotebookReadySources(notebookId?: string): Result {
  const { documents: cachedDocuments } = useNotebookDocumentsStore(notebookId);
  const hasCachedDocuments = cachedDocuments.length > 0;
  const cachedReadySources = notebookId
    ? readySourcesCache.get(notebookId)
    : undefined;

  const shouldFetch =
    Boolean(notebookId) && !hasCachedDocuments && cachedReadySources === undefined;
  const {
    documents: fetchedDocuments,
    isLoading: isFetching,
    error,
  } = useDocuments(notebookId, shouldFetch);

  const documents = hasCachedDocuments ? cachedDocuments : fetchedDocuments;

  const hasReadySources = useMemo(
    () =>
      documents.length > 0
        ? documents.some((document) => document.status === "done")
        : (cachedReadySources ?? false),
    [documents, cachedReadySources],
  );

  useEffect(() => {
    if (!notebookId || documents.length === 0) return;
    readySourcesCache.set(notebookId, hasReadySources);
  }, [notebookId, documents.length, hasReadySources]);

  const isLoading = shouldFetch && isFetching && cachedReadySources === undefined;

  return { hasReadySources, isLoading, error };
}
