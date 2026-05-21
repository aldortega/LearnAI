import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  AudioConfigOut,
  AudioGenerateRequest,
  AudioGenerationJobOut,
  AudioSuggestionsJobOut,
  PodcastDetailOut,
  PodcastListOut,
} from "../types/audio.types";

export const audioApi = {
  getConfig: async (notebookId: string): Promise<AudioConfigOut> => {
    return apiRequest<AudioConfigOut>(`/notebooks/${notebookId}/audio/config`, {
      method: "GET",
    });
  },

  generateSuggestions: async (
    notebookId: string,
  ): Promise<AudioSuggestionsJobOut> => {
    return apiRequest<AudioSuggestionsJobOut>(
      `/notebooks/${notebookId}/audio/suggestions/generate`,
      { method: "POST" },
    );
  },

  getLatestSuggestionsGeneration: async (
    notebookId: string,
  ): Promise<AudioSuggestionsJobOut> => {
    return apiRequest<AudioSuggestionsJobOut>(
      `/notebooks/${notebookId}/audio/suggestions/generate`,
      { method: "GET" },
    );
  },

  getSuggestionsGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<AudioSuggestionsJobOut> => {
    return apiRequest<AudioSuggestionsJobOut>(
      `/notebooks/${notebookId}/audio/suggestions/generate/${jobId}`,
      { method: "GET" },
    );
  },

  generate: async (
    notebookId: string,
    payload: AudioGenerateRequest,
  ): Promise<AudioGenerationJobOut> => {
    return apiRequest<AudioGenerationJobOut>(
      `/notebooks/${notebookId}/audio/generate`,
      { method: "POST", body: payload },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<AudioGenerationJobOut> => {
    return apiRequest<AudioGenerationJobOut>(
      `/notebooks/${notebookId}/audio/generate`,
      { method: "GET" },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<AudioGenerationJobOut> => {
    return apiRequest<AudioGenerationJobOut>(
      `/notebooks/${notebookId}/audio/generate/${jobId}`,
      { method: "GET" },
    );
  },

  listPodcasts: async (notebookId: string): Promise<PodcastListOut> => {
    return apiRequest<PodcastListOut>(`/notebooks/${notebookId}/audio`, {
      method: "GET",
    });
  },

  getPodcast: async (
    notebookId: string,
    podcastId: string,
  ): Promise<PodcastDetailOut> => {
    return apiRequest<PodcastDetailOut>(
      `/notebooks/${notebookId}/audio/${podcastId}`,
      { method: "GET" },
    );
  },

  deletePodcast: async (notebookId: string, podcastId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/audio/${podcastId}`, {
      method: "DELETE",
    });
  },
};
