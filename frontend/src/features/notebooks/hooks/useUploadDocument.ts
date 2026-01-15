import { useCallback, useState } from "react";

import { documentsApi } from "../api/documentsApi";
import type { DocumentCreateResponse } from "../types/documents.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  uploadDocument: (file: File) => Promise<DocumentCreateResponse | null>;
  isUploading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useUploadDocument(notebookId?: string): Result {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const uploadDocument = useCallback(
    async (file: File): Promise<DocumentCreateResponse | null> => {
      if (!notebookId) return null;

      setIsUploading(true);
      setError(null);

      try {
        return await documentsApi.upload(notebookId, file);
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [notebookId],
  );

  return { uploadDocument, isUploading, error, clearError };
}
