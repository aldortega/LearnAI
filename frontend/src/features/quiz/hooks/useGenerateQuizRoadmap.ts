import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { quizApi } from "../api/quizApi";
import type {
  QuizGenerateRequest,
  QuizGenerationJobOut,
} from "../types/quiz.types";

type Result = {
  generate: (options: QuizGenerateRequest) => Promise<QuizGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<QuizGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateQuizRoadmap(notebookId?: string): Result {
  return useGenerationJob<QuizGenerateRequest, QuizGenerationJobOut>({
    notebookId,
    kind: "quiz_roadmap",
    generateRequest: quizApi.generateRoadmap,
    getLatestRequest: quizApi.getLatestGeneration,
    defaultFailedError: "No se pudo generar el quiz.",
    toErrorMessage: toNotebookErrorMessage,
  });
}
