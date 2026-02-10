import { useCallback, useEffect, useState } from "react";

import type { ApiError } from "../../../shared/lib/apiClient";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportOut } from "../types/reports.types";

type Result = {
  report: ReportOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<ReportOut | null>;
};

export function useReportDetail(notebookId?: string, reportId?: string): Result {
  const [report, setReport] = useState<ReportOut | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId || !reportId) {
      setReport(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getReport(notebookId, reportId);
      setReport(data);
      return data;
    } catch (e) {
      const apiError = e as ApiError | undefined;
      if (apiError?.status === 404) {
        setReport(null);
        return null;
      }
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId, reportId]);

  useEffect(() => {
    if (!notebookId || !reportId) {
      setReport(null);
      return;
    }
    void reload();
  }, [notebookId, reportId, reload]);

  return { report, isLoading, error, reload };
}
