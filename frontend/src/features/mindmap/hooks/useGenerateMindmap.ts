import { useCallback } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { mindmapApi } from "../api/mindmapApi";
import type {
  MindmapGenerateRequest,
  MindmapGenerationJobOut,
} from "../types/mindmap.types";

type Result = {
  generate: (
    payload?: MindmapGenerateRequest,
  ) => Promise<MindmapGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<MindmapGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateMindmap(notebookId?: string): Result {
  const base = useGenerationJob<
    MindmapGenerateRequest | undefined,
    MindmapGenerationJobOut
  >({
    notebookId,
    kind: "mindmap",
    generateRequest: mindmapApi.generateMindmap,
    getLatestRequest: async (id) => mindmapApi.getLatestGeneration(id),
    defaultFailedError: "No se pudo generar el mapa mental.",
    toErrorMessage: toNotebookErrorMessage,
  });

  const generate = useCallback(
    (payload?: MindmapGenerateRequest) => base.generate(payload),
    [base],
  );

  return {
    generate,
    resumeLatest: base.resumeLatest,
    isGenerating: base.isGenerating,
    error: base.error,
    clearError: base.clearError,
  };
}
