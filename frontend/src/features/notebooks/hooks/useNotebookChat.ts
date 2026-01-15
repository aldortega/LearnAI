import { useCallback, useEffect, useRef, useState } from "react";

import { chatApi, streamChatMessage } from "../api/chatApi";
import type { ChatMessage, ChatConversation } from "../types/chat.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  streamingContent: string;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
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
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isActive = true;
    abortRef.current?.abort();
    abortRef.current = null;

    setConversation(null);
    setMessages([]);
    setStreamingContent("");
    setIsStreaming(false);
    setError(null);

    if (!notebookId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadConversation = async () => {
      try {
        const conversationData = await chatApi.getConversation(notebookId);
        const messagesData = await chatApi.getMessages(notebookId);
        if (!isActive) return;
        setConversation(conversationData);
        setMessages(messagesData);
      } catch (err) {
        if (!isActive) return;
        setError(toNotebookErrorMessage(err));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadConversation();

    return () => {
      isActive = false;
    };
  }, [notebookId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!notebookId || !trimmed || isStreaming) return;

      setError(null);
      setStreamingContent("");
      setIsStreaming(true);

      setMessages((prev) => [...prev, buildLocalMessage(trimmed, notebookId)]);

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
              setMessages((prev) => [...prev, message]);
              setStreamingContent("");
              setIsStreaming(false);
            },
            onError: (message) => {
              setError(message);
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
        setError(toNotebookErrorMessage(err));
        setStreamingContent("");
        setIsStreaming(false);
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, notebookId],
  );

  const resetError = useCallback(() => setError(null), []);

  return {
    conversation,
    messages,
    streamingContent,
    isLoading,
    isStreaming,
    error,
    sendMessage,
    resetError,
  };
}
