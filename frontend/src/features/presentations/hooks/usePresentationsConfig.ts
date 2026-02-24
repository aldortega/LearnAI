import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { presentationsApi } from "../api/presentationsApi";
import type { PresentationConfigOut } from "../types/presentations.types";

const presentationsConfigCache = new Map<string, PresentationConfigOut>();

type Result = {
  config: PresentationConfigOut | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<PresentationConfigOut | null>;
};

export function usePresentationsConfig(notebookId?: string): Result {
  const [config, setConfig] = useState<PresentationConfigOut | null>(() =>
    notebookId ? presentationsConfigCache.get(notebookId) ?? null : null,
  );
  const [isLoading, setIsLoading] = useState(() =>
    notebookId ? !presentationsConfigCache.has(notebookId) : false,
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
      const data = await presentationsApi.getConfig(notebookId);
      presentationsConfigCache.set(notebookId, data);
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

    const cachedConfig = presentationsConfigCache.get(notebookId);
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
