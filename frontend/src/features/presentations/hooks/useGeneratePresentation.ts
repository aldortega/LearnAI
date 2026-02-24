import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { presentationsApi } from "../api/presentationsApi";
import type {
  PresentationGenerateRequest,
  PresentationGenerationJobOut,
} from "../types/presentations.types";

type Result = {
  generate: (
    payload: PresentationGenerateRequest,
  ) => Promise<PresentationGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<PresentationGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGeneratePresentation(notebookId?: string): Result {
  return useGenerationJob<PresentationGenerateRequest, PresentationGenerationJobOut>({
    notebookId,
    kind: "presentations",
    generateRequest: presentationsApi.generate,
    getLatestRequest: async (id) => presentationsApi.getLatestGeneration(id),
    defaultFailedError: "No se pudo generar la presentacion.",
    toErrorMessage: toNotebookErrorMessage,
  });
}
