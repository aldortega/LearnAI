import { useCallback, useMemo } from "react";
import useSWR, { unstable_serialize, useSWRConfig } from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportOut } from "../types/reports.types";

type Result = {
  reports: ReportOut[];
  isLoading: boolean;
  hasResolved: boolean;
  error: string | null;
  reload: () => Promise<ReportOut[]>;
  removeReport: (reportId: string) => void;
};

export function useReportsHistory(notebookId?: string): Result {
  const { cache } = useSWRConfig();
  const fallbackData = useMemo<ReportOut[] | undefined>(() => {
    if (!notebookId) {
      return undefined;
    }

    const cacheKey = unstable_serialize(swrKeys.reportsHistory(notebookId));
    const cachedEntry = cache.get(cacheKey) as { data?: unknown } | undefined;
    const cachedData = cachedEntry?.data;

    return Array.isArray(cachedData) ? (cachedData as ReportOut[]) : undefined;
  }, [cache, notebookId]);

  const { data, error, isLoading, mutate } = useSWR<ReportOut[]>(
    notebookId ? swrKeys.reportsHistory(notebookId) : null,
    async () => {
      const history = await reportsApi.listReports(notebookId as string);
      return history.items;
    },
    {
      fallbackData,
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
    hasResolved: data !== undefined || error !== undefined,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
    removeReport,
  };
}
