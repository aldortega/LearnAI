import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  ReportConfigOut,
  ReportGenerateRequest,
  ReportGenerationJobOut,
  ReportListOut,
  ReportOut,
  ReportSuggestionsJobOut,
} from "../types/reports.types";

export const reportsApi = {
  getConfig: async (notebookId: string): Promise<ReportConfigOut> => {
    return apiRequest<ReportConfigOut>(`/notebooks/${notebookId}/reports/config`, {
      method: "GET",
    });
  },

  generateSuggestions: async (notebookId: string): Promise<ReportSuggestionsJobOut> => {
    return apiRequest<ReportSuggestionsJobOut>(
      `/notebooks/${notebookId}/reports/suggestions/generate`,
      {
        method: "POST",
      },
    );
  },

  getLatestSuggestionsGeneration: async (
    notebookId: string,
  ): Promise<ReportSuggestionsJobOut> => {
    return apiRequest<ReportSuggestionsJobOut>(
      `/notebooks/${notebookId}/reports/suggestions/generate`,
      {
        method: "GET",
      },
    );
  },

  getSuggestionsGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<ReportSuggestionsJobOut> => {
    return apiRequest<ReportSuggestionsJobOut>(
      `/notebooks/${notebookId}/reports/suggestions/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  generate: async (
    notebookId: string,
    payload: ReportGenerateRequest,
  ): Promise<ReportGenerationJobOut> => {
    return apiRequest<ReportGenerationJobOut>(
      `/notebooks/${notebookId}/reports/generate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<ReportGenerationJobOut> => {
    return apiRequest<ReportGenerationJobOut>(
      `/notebooks/${notebookId}/reports/generate`,
      {
        method: "GET",
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<ReportGenerationJobOut> => {
    return apiRequest<ReportGenerationJobOut>(
      `/notebooks/${notebookId}/reports/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  listReports: async (notebookId: string): Promise<ReportListOut> => {
    return apiRequest<ReportListOut>(`/notebooks/${notebookId}/reports`, {
      method: "GET",
    });
  },

  getReport: async (notebookId: string, reportId: string): Promise<ReportOut> => {
    return apiRequest<ReportOut>(`/notebooks/${notebookId}/reports/${reportId}`, {
      method: "GET",
    });
  },

  deleteReport: async (notebookId: string, reportId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/reports/${reportId}`, {
      method: "DELETE",
    });
  },
};
