import { apiRequest, apiUploadRequest } from "../../../shared/lib/apiClient";
import type { Document, DocumentCreateResponse } from "../types/documents.types";

export const documentsApi = {
  list: async (notebookId: string): Promise<Document[]> => {
    return apiRequest<Document[]>(`/notebooks/${notebookId}/documents`, {
      method: "GET",
    });
  },

  upload: async (
    notebookId: string,
    file: File,
  ): Promise<DocumentCreateResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    return apiUploadRequest<DocumentCreateResponse>(
      `/notebooks/${notebookId}/documents`,
      formData,
      {
        method: "POST",
      },
    );
  },

  remove: async (notebookId: string, documentId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/documents/${documentId}`, {
      method: "DELETE",
    });
  },
};
