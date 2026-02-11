import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  ReportConfigOut,
  ReportGenerateRequest,
  ReportGenerationJobOut,
  ReportListOut,
  ReportOut,
} from "../types/reports.types";

export const reportsApi = {
  getConfig: async (
    notebookId: string,
    options?: { refreshSuggestions?: boolean },
  ): Promise<ReportConfigOut> => {
    const searchParams = new URLSearchParams();
    if (options?.refreshSuggestions) {
      searchParams.set("refresh_suggestions", "true");
    }
    const query = searchParams.toString();
    const url = `/notebooks/${notebookId}/reports/config${query ? `?${query}` : ""}`;
    return apiRequest<ReportConfigOut>(url, {
      method: "GET",
    });
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
