import { apiRequest, apiRequestWithStatus } from "../../../shared/lib/apiClient";
import type {
  QuizGenerateRequest,
  QuizGenerationJobOut,
  QuizAttemptOut,
  QuizQuestionOut,
  QuizQuestionsGenerationOut,
  QuizSubmitRequest,
  QuizSubmitResponse,
  RoadmapOut,
  RoadmapLevelOut,
} from "../types/quiz.types";

export const quizApi = {
  getRoadmap: async (notebookId: string): Promise<RoadmapOut> => {
    return apiRequest<RoadmapOut>(`/notebooks/${notebookId}/roadmap`, {
      method: "GET",
    });
  },

  deleteRoadmap: async (notebookId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/roadmap`, {
      method: "DELETE",
    });
  },

  generateRoadmap: async (
    notebookId: string,
    payload: QuizGenerateRequest,
  ): Promise<QuizGenerationJobOut> => {
    return apiRequest<QuizGenerationJobOut>(
      `/notebooks/${notebookId}/roadmap/generate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<QuizGenerationJobOut> => {
    return apiRequest<QuizGenerationJobOut>(
      `/notebooks/${notebookId}/roadmap/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<QuizGenerationJobOut> => {
    return apiRequest<QuizGenerationJobOut>(
      `/notebooks/${notebookId}/roadmap/generate`,
      {
        method: "GET",
      },
    );
  },

  listQuestions: async (
    notebookId: string,
    levelId: string,
  ): Promise<{ status: number; data: QuizQuestionOut[] | null }> => {
    return apiRequestWithStatus<QuizQuestionOut[]>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/questions`,
      {
        method: "GET",
      },
    );
  },

  generateLevelQuestions: async (
    notebookId: string,
    levelId: string,
  ): Promise<QuizQuestionsGenerationOut> => {
    return apiRequest<QuizQuestionsGenerationOut>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/questions/generate`,
      {
        method: "POST",
      },
    );
  },

  listAttempts: async (
    notebookId: string,
    levelId: string,
  ): Promise<QuizAttemptOut[]> => {
    return apiRequest<QuizAttemptOut[]>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/attempts`,
      {
        method: "GET",
      },
    );
  },

  resetAttempts: async (
    notebookId: string,
    levelId: string,
  ): Promise<RoadmapLevelOut> => {
    return apiRequest<RoadmapLevelOut>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/attempts/reset`,
      {
        method: "POST",
      },
    );
  },

  submitAnswer: async (
    notebookId: string,
    levelId: string,
    payload: QuizSubmitRequest,
  ): Promise<QuizSubmitResponse> => {
    return apiRequest<QuizSubmitResponse>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/submit`,
      {
        method: "POST",
        body: payload,
      },
    );
  },
};
