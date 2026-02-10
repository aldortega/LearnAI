import { useCallback, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";

type Result = {
  deleteReport: (reportId: string) => Promise<boolean>;
  deletingReportId: string | null;
  error: string | null;
  clearError: () => void;
};

export function useDeleteReport(notebookId?: string): Result {
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const deleteReport = useCallback(
    async (reportId: string) => {
      if (!notebookId) return false;

      setDeletingReportId(reportId);
      setError(null);
      try {
        await reportsApi.deleteReport(notebookId, reportId);
        return true;
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return false;
      } finally {
        setDeletingReportId(null);
      }
    },
    [notebookId],
  );

  return { deleteReport, deletingReportId, error, clearError };
}
