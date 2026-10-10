import type { CitableSource } from "../../../shared/lib/citations";

export type ChatRole = "user" | "assistant";

export type ChatSource = CitableSource;

export type ChatConversation = {
  id: string;
  owner_id: string;
  notebook_id: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  owner_id: string;
  notebook_id: string;
  role: ChatRole;
  content: string;
  sources: ChatSource[];
  created_at: string;
};
