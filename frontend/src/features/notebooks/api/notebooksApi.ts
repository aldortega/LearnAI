import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  Notebook,
  NotebookCreate,
  NotebookUpdate,
} from "../types/notebooks.types";

export const notebooksApi = {
  list: async (): Promise<Notebook[]> => {
    return apiRequest<Notebook[]>("/notebooks", {
      method: "GET",
    });
  },

  get: async (notebookId: string): Promise<Notebook> => {
    return apiRequest<Notebook>(`/notebooks/${notebookId}`, {
      method: "GET",
    });
  },

  create: async (payload: NotebookCreate): Promise<Notebook> => {
    return apiRequest<Notebook>("/notebooks", {
      method: "POST",
      body: payload,
    });
  },

  update: async (
    notebookId: string,
    payload: NotebookUpdate,
  ): Promise<Notebook> => {
    return apiRequest<Notebook>(`/notebooks/${notebookId}`, {
      method: "PATCH",
      body: payload,
    });
  },

  remove: async (notebookId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}`, {
      method: "DELETE",
    });
  },
};
