import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";

export function useMindmapNotebookSources(notebookId?: string) {
  return useNotebookStudioSources(notebookId);
}
