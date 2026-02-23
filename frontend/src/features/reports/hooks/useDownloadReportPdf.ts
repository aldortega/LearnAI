import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";

type Result = {
  downloadReportPdf: (reportId: string) => Promise<boolean>;
  downloadingReportId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDownloadReportPdf(notebookId?: string): Result {
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const downloadReportPdf = useCallback(
    async (reportId: string) => {
      if (!notebookId) return false;

      setDownloadingReportId(reportId);
      setError(null);
      try {
        const { blob, fileName } = await reportsApi.downloadReportPdf(notebookId, reportId);
        triggerBrowserDownload(blob, fileName);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDownloadingReportId(null);
      }
    },
    [notebookId],
  );

  return { downloadReportPdf, downloadingReportId, error, clearError };
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
