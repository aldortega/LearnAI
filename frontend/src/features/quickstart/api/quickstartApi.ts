import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  QuickstartExpansionOut,
  QuickstartGenerationJobOut,
  QuickstartTopicDetailIn,
  QuickstartTopicDetailOut,
  QuickstartOut,
  QuickstartSuggestionsOut,
  QuickstartTopic,
} from "../types/quickstart.types";

export const quickstartApi = {
  getQuickstart: async (notebookId: string): Promise<QuickstartOut> => {
    return apiRequest<QuickstartOut>(`/notebooks/${notebookId}/quickstart`, {
      method: "GET",
    });
  },

  generateQuickstart: async (
    notebookId: string,
  ): Promise<QuickstartGenerationJobOut> => {
    return apiRequest<QuickstartGenerationJobOut>(
      `/notebooks/${notebookId}/quickstart/generate`,
      {
        method: "POST",
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<QuickstartGenerationJobOut> => {
    return apiRequest<QuickstartGenerationJobOut>(
      `/notebooks/${notebookId}/quickstart/generate`,
      {
        method: "GET",
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<QuickstartGenerationJobOut> => {
    return apiRequest<QuickstartGenerationJobOut>(
      `/notebooks/${notebookId}/quickstart/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  expandTopic: async (
    notebookId: string,
    topicId: string,
  ): Promise<QuickstartExpansionOut> => {
    return apiRequest<QuickstartExpansionOut>(
      `/notebooks/${notebookId}/quickstart/topics/${topicId}/expand`,
      {
        method: "POST",
      },
    );
  },

  getTopicDetail: async (
    notebookId: string,
    topicId: string,
    payload: QuickstartTopicDetailIn,
  ): Promise<QuickstartTopicDetailOut> => {
    return apiRequest<QuickstartTopicDetailOut>(
      `/notebooks/${notebookId}/quickstart/topics/${topicId}/details`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getSuggestions: async (
    notebookId: string,
  ): Promise<QuickstartSuggestionsOut> => {
    return apiRequest<QuickstartSuggestionsOut>(
      `/notebooks/${notebookId}/quickstart/suggestions`,
      {
        method: "GET",
      },
    );
  },

  addTopic: async (notebookId: string, title: string): Promise<QuickstartTopic> => {
    return apiRequest<QuickstartTopic>(`/notebooks/${notebookId}/quickstart/topics`, {
      method: "POST",
      body: { title },
    });
  },
};
