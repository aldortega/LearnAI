export type ChatRole = "user" | "assistant";

export type ChatSource = {
  file_name: string;
};

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
