import { useEffect, useRef } from "react";

import { getApiBaseUrl } from "../../../shared/lib/apiClient";
import type { Document } from "../types/documents.types";
import {
  setNotebookDocuments,
  setNotebookDocumentsError,
  setNotebookStreaming,
  useNotebookDocumentsStore,
} from "./useNotebookDocumentsStore";

const STREAM_ERROR_MESSAGE = "No se pudo conectar al stream";

type Result = {
  documents: Document[];
  isStreaming: boolean;
  error: string | null;
};

export function useDocumentStream(
  notebookId?: string,
  streamKey = 0,
): Result {
  const { documents, isStreaming, error } = useNotebookDocumentsStore(notebookId);
  const latestDocumentsRef = useRef<Document[]>([]);

  useEffect(() => {
    if (!notebookId) {
      return;
    }

    const baseUrl = getApiBaseUrl();
    const streamUrl = `${baseUrl}/notebooks/${notebookId}/documents/stream?key=${streamKey}`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    queueMicrotask(() => {
      setNotebookStreaming(notebookId, true);
      setNotebookDocumentsError(notebookId, null);
    });

    const handleDocuments = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Document[];
        latestDocumentsRef.current = data;
        setNotebookDocuments(notebookId, data);
      } catch {
        setNotebookDocumentsError(notebookId, STREAM_ERROR_MESSAGE);
        eventSource.close();
      }
    };

    const handleError = () => {
      const latestDocuments = latestDocumentsRef.current;
      const allDone =
        latestDocuments.length > 0 &&
        latestDocuments.every((doc) => doc.status === "done");

      eventSource.close();
      setNotebookStreaming(notebookId, false);
      if (!allDone) {
        setNotebookDocumentsError(notebookId, STREAM_ERROR_MESSAGE);
      }
    };

    eventSource.addEventListener("documents", handleDocuments);
    eventSource.addEventListener("error", handleError as EventListener);

    return () => {
      eventSource.close();
      eventSource.removeEventListener("documents", handleDocuments);
      eventSource.removeEventListener("error", handleError as EventListener);
    };
  }, [notebookId, streamKey]);

  return { documents, isStreaming, error };
}
