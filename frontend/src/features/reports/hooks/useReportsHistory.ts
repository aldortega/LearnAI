import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
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
  const { data, error, isLoading, mutate } = useSWR<ReportOut[]>(
    notebookId ? swrKeys.reportsHistory(notebookId) : null,
    async () => {
      const history = await reportsApi.listReports(notebookId as string);
      return history.items;
    },
  );

  const reload = useCallback(async () => {
    if (!notebookId) {
      return [];
    }

    try {
      const next = await mutate();
      return next ?? [];
    } catch {
      return [];
    }
  }, [mutate, notebookId]);

  const removeReport = useCallback(
    (reportId: string) => {
      if (!notebookId) {
        return;
      }

      void mutate(
        (currentReports) =>
          (currentReports ?? []).filter((item) => item.id !== reportId),
        { revalidate: false },
      );
    },
    [mutate, notebookId],
  );

  return {
    reports: data ?? [],
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
    removeReport,
  };
}
