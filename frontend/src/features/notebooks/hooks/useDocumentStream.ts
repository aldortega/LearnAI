import { useEffect, useRef, useState } from "react";

import { getApiBaseUrl } from "../../../shared/lib/apiClient";
import type { Document } from "../types/documents.types";

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
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestDocumentsRef = useRef<Document[]>([]);

  useEffect(() => {
    if (!notebookId) {
      setDocuments([]);
      setIsStreaming(false);
      setError(null);
      return;
    }

    const baseUrl = getApiBaseUrl();
    const streamUrl = `${baseUrl}/notebooks/${notebookId}/documents/stream?key=${streamKey}`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    setIsStreaming(true);
    setError(null);

    const handleDocuments = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as Document[];
        latestDocumentsRef.current = data;
        setDocuments(data);
      } catch {
        setError(STREAM_ERROR_MESSAGE);
        eventSource.close();
      }
    };

    const handleError = () => {
      const latestDocuments = latestDocumentsRef.current;
      const allDone =
        latestDocuments.length > 0 &&
        latestDocuments.every((doc) => doc.status === "done");

      eventSource.close();
      setIsStreaming(false);
      if (!allDone) {
        setError(STREAM_ERROR_MESSAGE);
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
