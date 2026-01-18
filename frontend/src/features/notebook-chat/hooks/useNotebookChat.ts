import { useCallback, useEffect, useRef, useState } from "react";

import { toNotebookErrorMessage } from "../../../shared/lib/apiErrors";
import { chatApi, streamChatMessage } from "../api/chatApi";
import type { ChatMessage } from "../types/chat.types";
import {
  appendChatMessage,
  clearChatMessages,
  setChatData,
  useChatStore,
} from "./useChatStore";

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

// Track which notebooks we've already fetched (persists across component mounts)
const fetchedNotebooks = new Set<string>();

export function useNotebookChat(notebookId?: string): Result {
  const { messages: cachedMessages } = useChatStore(notebookId);
  const [streamingContent, setStreamingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!notebookId) {
      setIsLoading(false);
      return;
    }

    // Skip if we already fetched for this notebook (even if result was empty)
    if (fetchedNotebooks.has(notebookId)) {
      return;
    }

    fetchedNotebooks.add(notebookId);
    setIsLoading(true);

    let isActive = true;

    const loadConversation = async () => {
      try {
        const conversationData = await chatApi.getConversation(notebookId);
        const messagesData = await chatApi.getMessages(notebookId);
        if (!isActive) return;
        setChatData(notebookId, conversationData, messagesData);
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

      appendChatMessage(notebookId, buildLocalMessage(trimmed, notebookId));

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
              appendChatMessage(notebookId, message);
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

  const clearConversation = useCallback(async () => {
    if (!notebookId || isClearing) return;

    setIsClearing(true);
    setError(null);

    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStreamingContent("");

    try {
      await chatApi.clearMessages(notebookId);
      clearChatMessages(notebookId);
    } catch (err) {
      setError(toNotebookErrorMessage(err));
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, notebookId]);

  const resetError = useCallback(() => setError(null), []);

  return {
    messages: cachedMessages,
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
