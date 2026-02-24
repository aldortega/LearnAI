import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";

type Result = {
  downloadPresentationPdf: (presentationId: string) => Promise<boolean>;
  downloadingPresentationId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDownloadPresentationPdf(notebookId?: string): Result {
  const [downloadingPresentationId, setDownloadingPresentationId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const downloadPresentationPdf = useCallback(
    async (presentationId: string) => {
      if (!notebookId) return false;

      setDownloadingPresentationId(presentationId);
      setError(null);
      try {
        const { blob, fileName } = await presentationsApi.downloadPresentationPdf(
          notebookId,
          presentationId,
        );
        triggerBrowserDownload(blob, fileName);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDownloadingPresentationId(null);
      }
    },
    [notebookId],
  );

  return { downloadPresentationPdf, downloadingPresentationId, error, clearError };
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}
