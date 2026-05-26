import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  VoiceRetrieveResponse,
  VoiceTokenResponse,
} from "../types";

export const voiceApi = {
  fetchToken: async (notebookId: string): Promise<VoiceTokenResponse> => {
    return apiRequest<VoiceTokenResponse>(`/voice/${notebookId}/token`, {
      method: "POST",
    });
  },

  retrieve: async (
    notebookId: string,
    query: string,
  ): Promise<VoiceRetrieveResponse> => {
    return apiRequest<VoiceRetrieveResponse>(`/voice/${notebookId}/retrieve`, {
      method: "POST",
      body: { query },
    });
  },
};
