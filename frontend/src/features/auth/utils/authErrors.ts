import type { ApiError } from "../../../shared/lib/apiClient";

export function toAuthErrorMessage(error: unknown): string {
  const apiError = error as ApiError | undefined;

  if (apiError?.status === 401) return "Credenciales inválidas";
  if (apiError?.status === 409) return "El correo o username ya existe";

  return apiError?.message ?? "No se pudo completar la solicitud";
}
