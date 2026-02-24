import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { reportsApi } from "../api/reportsApi";
import type {
  ReportGenerateRequest,
  ReportGenerationJobOut,
} from "../types/reports.types";

type Result = {
  generate: (
    payload: ReportGenerateRequest,
  ) => Promise<ReportGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<ReportGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateReport(notebookId?: string): Result {
  return useGenerationJob<ReportGenerateRequest, ReportGenerationJobOut>({
    notebookId,
    kind: "reports",
    generateRequest: reportsApi.generate,
    getLatestRequest: async (id) => reportsApi.getLatestGeneration(id),
    defaultFailedError: "No se pudo generar el informe.",
    toErrorMessage: toNotebookErrorMessage,
  });
}
