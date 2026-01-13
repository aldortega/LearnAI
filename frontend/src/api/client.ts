const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || "Error inesperado");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
