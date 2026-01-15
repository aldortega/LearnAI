import type { ApiError } from "../../../shared/lib/apiClient";

export function toNotebookErrorMessage(error: unknown): string {
  const apiError = error as ApiError | undefined;

  return apiError?.message ?? "No se pudo completar la solicitud";
}
