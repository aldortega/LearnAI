import { useCallback } from "react";
import useSWR from "swr";

import type { ApiError } from "../../../shared/lib/apiClient";
import { swrKeys } from "../../../shared/lib/swrKeys";
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
  const { data, error, isLoading, mutate } = useSWR<ReportOut | null>(
    notebookId && reportId
      ? swrKeys.reportDetail(notebookId, reportId)
      : null,
    async () => {
      try {
        return await reportsApi.getReport(notebookId as string, reportId as string);
      } catch (e) {
        const apiError = e as ApiError | undefined;
        if (apiError?.status === 404) {
          return null;
        }
        throw e;
      }
    },
  );

  const reload = useCallback(async () => {
    if (!notebookId || !reportId) return null;
    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId, reportId]);

  return {
    report: data ?? null,
    isLoading: isLoading && data === undefined,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
