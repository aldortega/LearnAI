import {
  type ApiError,
  apiRequest,
  getApiBaseUrl,
  getApiErrorMessage,
} from "../../../shared/lib/apiClient";
import type {
  PresentationApplySlideRequest,
  PresentationConfigOut,
  PresentationGenerateRequest,
  PresentationGenerationJobOut,
  PresentationListOut,
  PresentationRegenerateSlideOut,
  PresentationRegenerateSlideRequest,
  PresentationOut,
} from "../types/presentations.types";

export const presentationsApi = {
  getConfig: async (notebookId: string): Promise<PresentationConfigOut> => {
    return apiRequest<PresentationConfigOut>(
      `/notebooks/${notebookId}/presentations/config`,
      {
        method: "GET",
      },
    );
  },

  generate: async (
    notebookId: string,
    payload: PresentationGenerateRequest,
  ): Promise<PresentationGenerationJobOut> => {
    return apiRequest<PresentationGenerationJobOut>(
      `/notebooks/${notebookId}/presentations/generate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  getLatestGeneration: async (
    notebookId: string,
  ): Promise<PresentationGenerationJobOut> => {
    return apiRequest<PresentationGenerationJobOut>(
      `/notebooks/${notebookId}/presentations/generate`,
      {
        method: "GET",
      },
    );
  },

  getGenerationStatus: async (
    notebookId: string,
    jobId: string,
  ): Promise<PresentationGenerationJobOut> => {
    return apiRequest<PresentationGenerationJobOut>(
      `/notebooks/${notebookId}/presentations/generate/${jobId}`,
      {
        method: "GET",
      },
    );
  },

  listPresentations: async (notebookId: string): Promise<PresentationListOut> => {
    return apiRequest<PresentationListOut>(`/notebooks/${notebookId}/presentations`, {
      method: "GET",
    });
  },

  getPresentation: async (
    notebookId: string,
    presentationId: string,
  ): Promise<PresentationOut> => {
    return apiRequest<PresentationOut>(
      `/notebooks/${notebookId}/presentations/${presentationId}`,
      {
        method: "GET",
      },
    );
  },

  downloadPresentationPdf: async (
    notebookId: string,
    presentationId: string,
  ): Promise<{ blob: Blob; fileName: string }> => {
    const response = await fetch(
      `${getApiBaseUrl()}/notebooks/${notebookId}/presentations/${presentationId}/pdf`,
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
    const fileName =
      parsePdfFilename(contentDisposition) ?? `presentacion-${presentationId}.pdf`;
    const blob = await response.blob();
    return { blob, fileName };
  },

  deletePresentation: async (
    notebookId: string,
    presentationId: string,
  ): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/presentations/${presentationId}`, {
      method: "DELETE",
    });
  },

  regenerateSlide: async (
    notebookId: string,
    presentationId: string,
    slideIndex: number,
    payload: PresentationRegenerateSlideRequest,
  ): Promise<PresentationRegenerateSlideOut> => {
    return apiRequest<PresentationRegenerateSlideOut>(
      `/notebooks/${notebookId}/presentations/${presentationId}/slides/${slideIndex}/regenerate`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  applySlide: async (
    notebookId: string,
    presentationId: string,
    slideIndex: number,
    payload: PresentationApplySlideRequest,
  ): Promise<void> => {
    await apiRequest<void>(
      `/notebooks/${notebookId}/presentations/${presentationId}/slides/${slideIndex}/apply`,
      {
        method: "POST",
        body: payload,
      },
    );
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
