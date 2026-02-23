import { useEffect, useMemo } from "react";

import { useDocuments } from "./useDocuments";
import { useNotebookDocumentsStore } from "./useNotebookDocumentsStore";

const readySourcesCache = new Map<string, boolean>();

type Result = {
  hasReadySources: boolean;
  hasAnyDocuments: boolean;
  hasProcessingDocuments: boolean;
  isResolving: boolean;
  error: string | null;
};

export function useNotebookReadySources(notebookId?: string): Result {
  const {
    documents: cachedDocuments,
    hasSnapshot: hasCachedSnapshot,
  } = useNotebookDocumentsStore(notebookId);
  const cachedReadySources = notebookId
    ? readySourcesCache.get(notebookId)
    : undefined;

  const shouldFetch = Boolean(notebookId) && !hasCachedSnapshot;
  const {
    documents: fetchedDocuments,
    isLoading: isFetching,
    error,
  } = useDocuments(notebookId, shouldFetch);

  const hasFetchedSnapshot = shouldFetch && !isFetching;
  const hasSnapshot = hasCachedSnapshot || hasFetchedSnapshot;
  const documents = hasCachedSnapshot ? cachedDocuments : fetchedDocuments;

  const hasReadySources = useMemo(
    () =>
      hasSnapshot
        ? documents.some((document) => document.status === "done")
        : (cachedReadySources ?? false),
    [documents, hasSnapshot, cachedReadySources],
  );

  const hasAnyDocuments = documents.length > 0;
  const hasProcessingDocuments = useMemo(
    () =>
      documents.some(
        (document) =>
          document.status === "pending" ||
          document.status === "queued" ||
          document.status === "processing",
      ),
    [documents],
  );

  useEffect(() => {
    if (!notebookId || !hasSnapshot) return;
    readySourcesCache.set(notebookId, hasReadySources);
  }, [notebookId, hasSnapshot, hasReadySources]);

  const isResolving = shouldFetch && isFetching;
  return {
    hasReadySources,
    hasAnyDocuments,
    hasProcessingDocuments,
    isResolving,
    error,
  };
}
