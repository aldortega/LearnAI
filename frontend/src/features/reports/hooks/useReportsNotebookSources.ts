import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";

export function useReportsNotebookSources(notebookId?: string) {
  return useNotebookStudioSources(notebookId);
}
