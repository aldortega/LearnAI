import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { notebooksApi } from "../api/notebooksApi";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

export function useNotebook(notebookId?: string) {
  const { data, error, isLoading } = useSWR(
    notebookId ? swrKeys.notebook(notebookId) : null,
    () => notebooksApi.get(notebookId as string),
  );

  return {
    notebook: data ?? null,
    isLoading: isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
  };
}
