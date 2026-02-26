import { useCallback } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportConfigOut } from "../types/reports.types";

type Result = {
  config: ReportConfigOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<ReportConfigOut | null>;
};

export function useReportsConfig(notebookId?: string): Result {
  const { data, error, isLoading, mutate } = useSWR<ReportConfigOut>(
    notebookId ? swrKeys.reportsConfig(notebookId) : null,
    () => reportsApi.getConfig(notebookId as string),
  );

  const reload = useCallback(async () => {
    if (!notebookId) {
      return null;
    }

    try {
      const next = await mutate();
      return next ?? null;
    } catch {
      return null;
    }
  }, [mutate, notebookId]);

  return {
    config: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
    reload,
  };
}
