import { useSyncExternalStore } from "react";

import type { ChatMessage, ChatConversation } from "../types/chat.types";

type ChatData = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
};

type StoreState = {
  chatByNotebookId: Map<string, ChatData>;
};

const storeState: StoreState = {
  chatByNotebookId: new Map(),
};

const listeners = new Set<() => void>();

const emptyData: ChatData = {
  conversation: null,
  messages: [],
};

const snapshotCache = new Map<string, ChatData>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): ChatData {
  if (!notebookId) {
    return emptyData;
  }

  const data = storeState.chatByNotebookId.get(notebookId);
  if (!data) {
    return emptyData;
  }

  const cached = snapshotCache.get(notebookId);
  if (cached === data) {
    return cached;
  }

  snapshotCache.set(notebookId, data);
  return data;
}

export function setChatData(
  notebookId: string,
  conversation: ChatConversation | null,
  messages: ChatMessage[],
) {
  storeState.chatByNotebookId.set(notebookId, { conversation, messages });
  emitChange();
}

export function setChatMessages(notebookId: string, messages: ChatMessage[]) {
  const existing = storeState.chatByNotebookId.get(notebookId);
  storeState.chatByNotebookId.set(notebookId, {
    conversation: existing?.conversation ?? null,
    messages,
  });
  emitChange();
}

export function appendChatMessage(notebookId: string, message: ChatMessage) {
  const existing = storeState.chatByNotebookId.get(notebookId);
  const messages = existing?.messages ?? [];
  storeState.chatByNotebookId.set(notebookId, {
    conversation: existing?.conversation ?? null,
    messages: [...messages, message],
  });
  emitChange();
}

export function clearChatMessages(notebookId: string) {
  const existing = storeState.chatByNotebookId.get(notebookId);
  storeState.chatByNotebookId.set(notebookId, {
    conversation: existing?.conversation ?? null,
    messages: [],
  });
  emitChange();
}

export function useChatStore(notebookId?: string): ChatData {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
