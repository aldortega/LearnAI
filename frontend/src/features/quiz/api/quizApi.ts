import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  QuizQuestionOut,
  QuizSubmitRequest,
  QuizSubmitResponse,
  RoadmapOut,
} from "../types/quiz.types";

export const quizApi = {
  getRoadmap: async (notebookId: string): Promise<RoadmapOut> => {
    return apiRequest<RoadmapOut>(`/notebooks/${notebookId}/roadmap`, {
      method: "GET",
    });
  },

  generateRoadmap: async (notebookId: string): Promise<RoadmapOut> => {
    return apiRequest<RoadmapOut>(`/notebooks/${notebookId}/roadmap/generate`, {
      method: "POST",
    });
  },

  listQuestions: async (
    notebookId: string,
    levelId: string,
  ): Promise<QuizQuestionOut[]> => {
    return apiRequest<QuizQuestionOut[]>(
      `/notebooks/${notebookId}/roadmap/levels/${levelId}/questions`,
      {
        method: "GET",
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
