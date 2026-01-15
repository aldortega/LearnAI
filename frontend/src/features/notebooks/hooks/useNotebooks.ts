import { useCallback, useEffect, useState } from "react";

import type { Notebook } from "../types/notebooks.types";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  notebooks: Notebook[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

export function useNotebooks(): Result {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await notebooksApi.list();
      setNotebooks(data);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { notebooks, isLoading, error, reload };
}
