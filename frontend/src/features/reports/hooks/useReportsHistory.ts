import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportOut } from "../types/reports.types";

type Result = {
  reports: ReportOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<ReportOut[]>;
  removeReport: (reportId: string) => void;
};

export function useReportsHistory(notebookId?: string): Result {
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setReports([]);
      setError(null);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsApi.listReports(notebookId);
      setReports(data.items);
      return data.items;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  const removeReport = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((item) => item.id !== reportId));
  }, []);

  useEffect(() => {
    if (!notebookId) return;
    void reload();
  }, [notebookId, reload]);

  return { reports, isLoading, error, reload, removeReport };
}
