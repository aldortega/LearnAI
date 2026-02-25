import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";

export function useFlashcardsNotebookSources(notebookId?: string) {
  return useNotebookStudioSources(notebookId);
}
