export type ApiError = {
  status: number;
  message: string;
  detail?: unknown;
};

function getBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function parseJsonSafe(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function extractMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Error de servidor";

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;

  return "Error de servidor";
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const headers = new Headers(options?.headers);
  if (options?.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
    body:
      options?.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    const error: ApiError = {
      status: response.status,
      message: extractMessage(payload),
      detail: payload,
    };
    throw error;
  }

  return payload as T;
}
