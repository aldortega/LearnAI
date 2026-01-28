import { apiRequest, getApiBaseUrl, type ApiError } from "../../../shared/lib/apiClient";
import type { ChatConversation, ChatMessage } from "../types/chat.types";

type ChatMessageCreate = {
  content: string;
};

type StreamHandlers = {
  onChunk: (content: string) => void;
  onDone: (message: ChatMessage) => void;
  onError: (message: string) => void;
};

type StreamDonePayload = {
  message: ChatMessage;
};

type StreamChunkPayload = {
  content: string;
};

type StreamErrorPayload = {
  message: string;
};

function parseErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Error de servidor";
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  return "Error de servidor";
}

function buildApiError(status: number, payload: unknown): ApiError {
  return {
    status,
    message: parseErrorMessage(payload),
    detail: payload,
  };
}

function parseEventPayload<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export const chatApi = {
  getConversation: async (
    notebookId: string,
    signal?: AbortSignal,
  ): Promise<ChatConversation> => {
    return apiRequest<ChatConversation>(`/notebooks/${notebookId}/conversation`, {
      method: "GET",
      signal,
    });
  },

  getMessages: async (
    notebookId: string,
    signal?: AbortSignal,
  ): Promise<ChatMessage[]> => {
    return apiRequest<ChatMessage[]>(
      `/notebooks/${notebookId}/conversation/messages`,
      {
        method: "GET",
        signal,
      },
    );
  },

  sendMessage: async (
    notebookId: string,
    payload: ChatMessageCreate,
  ): Promise<ChatMessage> => {
    return apiRequest<ChatMessage>(
      `/notebooks/${notebookId}/conversation/messages`,
      {
        method: "POST",
        body: payload,
      },
    );
  },

  clearMessages: async (notebookId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/conversation/messages`, {
      method: "DELETE",
    });
  },
};

export async function streamChatMessage(
  notebookId: string,
  content: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/notebooks/${notebookId}/conversation/messages/stream`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content }),
      signal,
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw buildApiError(response.status, payload);
  }

  if (!response.body) {
    throw buildApiError(500, { detail: "No se pudo leer el stream" });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const lines = rawEvent.split("\n");
      let eventType = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.replace("event:", "").trim();
          continue;
        }
        if (line.startsWith("data:")) {
          data += line.replace("data:", "").trim();
        }
      }

      if (!data) {
        separatorIndex = buffer.indexOf("\n\n");
        continue;
      }

      if (eventType === "chunk") {
        const payload = parseEventPayload<StreamChunkPayload>(data);
        if (payload?.content) {
          handlers.onChunk(payload.content);
        }
      }

      if (eventType === "done") {
        const payload = parseEventPayload<StreamDonePayload>(data);
        if (payload?.message) {
          handlers.onDone(payload.message);
        }
        await reader.cancel();
        return;
      }

      if (eventType === "error") {
        const payload = parseEventPayload<StreamErrorPayload>(data);
        if (payload?.message) {
          handlers.onError(payload.message);
        }
        await reader.cancel();
        return;
      }

      separatorIndex = buffer.indexOf("\n\n");
    }
  }
}
