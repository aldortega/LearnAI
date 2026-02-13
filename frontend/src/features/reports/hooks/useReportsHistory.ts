import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportOut } from "../types/reports.types";

const reportsHistoryCache = new Map<string, ReportOut[]>();

type Result = {
  reports: ReportOut[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<ReportOut[]>;
  removeReport: (reportId: string) => void;
};

export function hasCachedReports(notebookId?: string): boolean {
  if (!notebookId) return false;
  const cachedReports = reportsHistoryCache.get(notebookId);
  return Boolean(cachedReports && cachedReports.length > 0);
}

export function useReportsHistory(notebookId?: string): Result {
  const [reports, setReports] = useState<ReportOut[]>(() =>
    notebookId ? reportsHistoryCache.get(notebookId) ?? [] : [],
  );
  const [isLoading, setIsLoading] = useState(() =>
    notebookId ? !reportsHistoryCache.has(notebookId) : false,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setReports([]);
      setError(null);
      setIsLoading(false);
      return [];
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsApi.listReports(notebookId);
      reportsHistoryCache.set(notebookId, data.items);
      setReports(data.items);
      return data.items;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  const removeReport = useCallback(
    (reportId: string) => {
      setReports((prev) => {
        const next = prev.filter((item) => item.id !== reportId);
        if (notebookId) {
          reportsHistoryCache.set(notebookId, next);
        }
        return next;
      });
    },
    [notebookId],
  );

  useEffect(() => {
    if (!notebookId) {
      setReports([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cachedReports = reportsHistoryCache.get(notebookId);
    if (cachedReports) {
      setReports(cachedReports);
      setError(null);
      setIsLoading(false);
      return;
    }

    setReports([]);
    void reload();
  }, [notebookId, reload]);

  return { reports, isLoading, error, reload, removeReport };
}
