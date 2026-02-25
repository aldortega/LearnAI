import { useMemo } from "react";

import { useDocuments } from "./useDocuments";

type Result = {
  hasReadySources: boolean;
  hasAnyDocuments: boolean;
  hasProcessingDocuments: boolean;
  isResolving: boolean;
  error: string | null;
};

export function useNotebookReadySources(notebookId?: string): Result {
  const {
    documents,
    isLoading,
    error,
  } = useDocuments(notebookId);

  const hasReadySources = useMemo(
    () => documents.some((document) => document.status === "done"),
    [documents],
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

  return {
    hasReadySources,
    hasAnyDocuments,
    hasProcessingDocuments,
    isResolving: Boolean(notebookId) && isLoading,
    error,
  };
}
