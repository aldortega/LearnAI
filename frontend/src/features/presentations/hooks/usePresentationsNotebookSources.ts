import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";

export function usePresentationsNotebookSources(notebookId?: string) {
  return useNotebookStudioSources(notebookId);
}
