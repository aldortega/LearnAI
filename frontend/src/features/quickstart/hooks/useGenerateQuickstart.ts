import { useCallback } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { quickstartApi } from "../api/quickstartApi";
import type { QuickstartGenerationJobOut } from "../types/quickstart.types";

type Result = {
  generate: () => Promise<QuickstartGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<QuickstartGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateQuickstart(notebookId?: string): Result {
  const base = useGenerationJob<undefined, QuickstartGenerationJobOut>({
    notebookId,
    kind: "quickstart",
    generateRequest: (id) => quickstartApi.generateQuickstart(id),
    getLatestRequest: async (id) => quickstartApi.getLatestGeneration(id),
    defaultFailedError: "No se pudo generar el inicio rapido.",
    toErrorMessage: toNotebookErrorMessage,
  });

  const generate = useCallback(() => base.generate(undefined), [base]);

  return {
    generate,
    resumeLatest: base.resumeLatest,
    isGenerating: base.isGenerating,
    error: base.error,
    clearError: base.clearError,
  };
}
