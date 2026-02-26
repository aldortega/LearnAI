import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import { getApiBaseUrl } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { documentsApi } from "../api/documentsApi";
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
  const { data, mutate } = useSWR<Document[]>(
    notebookId ? swrKeys.documents(notebookId) : null,
    () => documentsApi.list(notebookId as string),
    {
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
    },
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestDocumentsRef = useRef<Document[]>([]);

  useEffect(() => {
    latestDocumentsRef.current = data ?? [];
  }, [data]);

  useEffect(() => {
    if (!notebookId) {
      return;
    }

    let isActive = true;
    const baseUrl = getApiBaseUrl();
    const streamUrl = `${baseUrl}/notebooks/${notebookId}/documents/stream?key=${streamKey}`;
    const eventSource = new EventSource(streamUrl, { withCredentials: true });

    queueMicrotask(() => {
      if (!isActive) {
        return;
      }

      setIsStreaming(true);
      setError(null);
    });

    const handleDocuments = (event: MessageEvent) => {
      if (!isActive) {
        return;
      }

      try {
        const data = JSON.parse(event.data) as Document[];
        latestDocumentsRef.current = data;
        setError(null);
        void mutate(data, { revalidate: false });
      } catch {
        setIsStreaming(false);
        setError(STREAM_ERROR_MESSAGE);
        eventSource.close();
      }
    };

    const handleError = () => {
      if (!isActive) {
        return;
      }

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
      isActive = false;
      eventSource.close();
      eventSource.removeEventListener("documents", handleDocuments);
      eventSource.removeEventListener("error", handleError as EventListener);
      setIsStreaming(false);
    };
  }, [mutate, notebookId, streamKey]);

  return {
    documents: data ?? [],
    isStreaming: notebookId ? isStreaming : false,
    error: notebookId ? error : null,
  };
}
