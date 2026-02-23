import {
  type ApiError,
  apiRequest,
  getApiBaseUrl,
  getApiErrorMessage,
} from "../../../shared/lib/apiClient";
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

  downloadReportPdf: async (
    notebookId: string,
    reportId: string,
  ): Promise<{ blob: Blob; fileName: string }> => {
    const response = await fetch(
      `${getApiBaseUrl()}/notebooks/${notebookId}/reports/${reportId}/pdf`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    if (!response.ok) {
      let payload: unknown = null;
      try {
        payload = (await response.json()) as unknown;
      } catch {
        payload = null;
      }
      const error: ApiError = {
        status: response.status,
        message: getApiErrorMessage(payload, response.status),
        detail: payload,
      };
      throw error;
    }

    const contentDisposition = response.headers.get("content-disposition");
    const fileName = parsePdfFilename(contentDisposition) ?? `informe-${reportId}.pdf`;
    const blob = await response.blob();
    return { blob, fileName };
  },

  deleteReport: async (notebookId: string, reportId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/reports/${reportId}`, {
      method: "DELETE",
    });
  },
};

function parsePdfFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }
  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] ?? null;
}
