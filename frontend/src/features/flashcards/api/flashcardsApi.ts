import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  FlashcardExplainOut,
  FlashcardsGenerateRequest,
  FlashcardsGenerationJobOut,
  FlashcardsOut,
} from "../types/flashcards.types";

export const flashcardsApi = {
  getFlashcards: async (notebookId: string): Promise<FlashcardsOut> => {
    return apiRequest<FlashcardsOut>(`/notebooks/${notebookId}/flashcards`, {
      method: "GET",
    });
  },

  deleteFlashcards: async (notebookId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/flashcards`, {
      method: "DELETE",
    });
  },

  generate: async (
    notebookId: string,
    payload?: FlashcardsGenerateRequest,
  ): Promise<FlashcardsGenerationJobOut> => {
    return apiRequest<FlashcardsGenerationJobOut>(
      `/notebooks/${notebookId}/flashcards/generate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<FlashcardsGenerationJobOut> => {
    return apiRequest<FlashcardsGenerationJobOut>(
      `/notebooks/${notebookId}/flashcards/generate`,
      {
        method: "GET",
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<FlashcardsGenerationJobOut> => {
    return apiRequest<FlashcardsGenerationJobOut>(
      `/notebooks/${notebookId}/flashcards/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  explain: async (
    notebookId: string,
    setId: string,
    cardId: string,
  ): Promise<FlashcardExplainOut> => {
    return apiRequest<FlashcardExplainOut>(
      `/notebooks/${notebookId}/flashcards/explain`,
      {
        method: "POST",
        body: { set_id: setId, card_id: cardId },
      },
    );
  },
};
