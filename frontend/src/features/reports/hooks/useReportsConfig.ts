import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { reportsApi } from "../api/reportsApi";
import type { ReportConfigOut } from "../types/reports.types";

const reportsConfigCache = new Map<string, ReportConfigOut>();

type Result = {
  config: ReportConfigOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<ReportConfigOut | null>;
};

export function useReportsConfig(notebookId?: string): Result {
  const [config, setConfig] = useState<ReportConfigOut | null>(() =>
    notebookId ? reportsConfigCache.get(notebookId) ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(() =>
    notebookId ? !reportsConfigCache.has(notebookId) : false,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!notebookId) {
      setConfig(null);
      setError(null);
      setIsLoading(false);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await reportsApi.getConfig(notebookId);
      reportsConfigCache.set(notebookId, data);
      setConfig(data);
      return data;
    } catch (e) {
      setError(toNotebookErrorMessage(e));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) {
      setConfig(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    const cachedConfig = reportsConfigCache.get(notebookId);
    if (cachedConfig) {
      setConfig(cachedConfig);
      setError(null);
      setIsLoading(false);
      return;
    }

    setConfig(null);
    void reload();
  }, [notebookId, reload]);

  return { config, isLoading, error, reload };
}
