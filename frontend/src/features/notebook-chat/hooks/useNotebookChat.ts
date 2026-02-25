import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

import { toNotebookErrorMessage } from "../../../shared/lib/apiErrors";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { chatApi, streamChatMessage } from "../api/chatApi";
import type { ChatMessage } from "../types/chat.types";

type Result = {
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  isStreaming: boolean;
  isClearing: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  resetError: () => void;
};

function buildLocalMessage(content: string, notebookId: string): ChatMessage {
  return {
    id: `local-${crypto.randomUUID()}`,
    conversation_id: "local",
    owner_id: "local",
    notebook_id: notebookId,
    role: "user",
    content,
    sources: [],
    created_at: new Date().toISOString(),
  };
}

export function useNotebookChat(notebookId?: string): Result {
  const { error: conversationError, isLoading: isConversationLoading } = useSWR(
    notebookId ? swrKeys.chatConversation(notebookId) : null,
    () => chatApi.getConversation(notebookId as string),
  );
  const {
    data: messages,
    error: messagesError,
    isLoading: isMessagesLoading,
    mutate: mutateMessages,
  } = useSWR<ChatMessage[]>(
    notebookId ? swrKeys.chatMessages(notebookId) : null,
    () => chatApi.getMessages(notebookId as string),
  );
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!notebookId || !trimmed || isStreaming) return;

      setStreamError(null);
      setStreamingContent("");
      setIsStreaming(true);

      const localMessage = buildLocalMessage(trimmed, notebookId);
      await mutateMessages(
        (currentMessages) => [...(currentMessages ?? []), localMessage],
        { revalidate: false },
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChatMessage(
          notebookId,
          trimmed,
          {
            onChunk: (chunk) => {
              setStreamingContent((prev) => prev + chunk);
            },
            onDone: (message) => {
              void mutateMessages(
                (currentMessages) => [...(currentMessages ?? []), message],
                { revalidate: false },
              );
              setStreamingContent("");
              setIsStreaming(false);
            },
            onError: (message) => {
              setStreamError(message);
              setStreamingContent("");
              setIsStreaming(false);
            },
          },
          controller.signal,
        );
      } catch (err) {
        if ((err as Error)?.name === "AbortError") {
          setStreamingContent("");
          setIsStreaming(false);
          return;
        }
        setStreamError(toNotebookErrorMessage(err));
        setStreamingContent("");
        setIsStreaming(false);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, mutateMessages, notebookId],
  );

  const clearConversation = useCallback(async () => {
    if (!notebookId || isClearing) return;

    setIsClearing(true);
    setStreamError(null);

    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");

    try {
      await chatApi.clearMessages(notebookId);
      await mutateMessages([], { revalidate: false });
    } catch (err) {
      setStreamError(toNotebookErrorMessage(err));
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, mutateMessages, notebookId]);

  const resetError = useCallback(() => setStreamError(null), []);

  const isLoading = notebookId
    ? (isConversationLoading || isMessagesLoading) && !messages
    : false;
  const error = streamError
    ?? (conversationError ? toNotebookErrorMessage(conversationError) : null)
    ?? (messagesError ? toNotebookErrorMessage(messagesError) : null);

  return {
    messages: messages ?? [],
    streamingContent,
    isLoading,
    isStreaming,
    isClearing,
    error,
    sendMessage,
    clearConversation,
    resetError,
  };
}
