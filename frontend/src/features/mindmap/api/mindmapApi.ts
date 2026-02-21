import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  MindmapGenerateRequest,
  MindmapGenerationJobOut,
  MindmapNodeDetailOut,
  MindmapOut,
} from "../types/mindmap.types";

export const mindmapApi = {
  getMindmap: async (notebookId: string): Promise<MindmapOut> => {
    return apiRequest<MindmapOut>(`/notebooks/${notebookId}/mindmap`, {
      method: "GET",
    });
  },

  generateMindmap: async (
    notebookId: string,
    payload?: MindmapGenerateRequest,
  ): Promise<MindmapGenerationJobOut> => {
    return apiRequest<MindmapGenerationJobOut>(
      `/notebooks/${notebookId}/mindmap/generate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<MindmapGenerationJobOut> => {
    return apiRequest<MindmapGenerationJobOut>(
      `/notebooks/${notebookId}/mindmap/generate`,
      {
        method: "GET",
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<MindmapGenerationJobOut> => {
    return apiRequest<MindmapGenerationJobOut>(
      `/notebooks/${notebookId}/mindmap/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  getNodeDetail: async (
    notebookId: string,
    nodeId: string,
  ): Promise<MindmapNodeDetailOut> => {
    return apiRequest<MindmapNodeDetailOut>(
      `/notebooks/${notebookId}/mindmap/nodes/${nodeId}/detail`,
      {
        method: "POST",
      },
    );
  },
};
