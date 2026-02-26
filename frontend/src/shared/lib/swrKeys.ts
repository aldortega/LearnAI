export const swrKeys = {
  notebooks: (userId: string) => ["notebooks", userId] as const,
  notebook: (notebookId: string) => ["notebook", notebookId] as const,
  documents: (notebookId: string) => ["documents", notebookId] as const,
  quickstart: (notebookId: string) => ["quickstart", notebookId] as const,
  quickstartSuggestions: (notebookId: string) =>
    ["quickstart-suggestions", notebookId] as const,
  quickstartTopicDetail: (
    notebookId: string,
    topicId: string,
    itemType: string,
    itemText: string,
  ) =>
    ["quickstart-topic-detail", notebookId, topicId, itemType, itemText] as const,
  roadmap: (notebookId: string) => ["roadmap", notebookId] as const,
  chatConversation: (notebookId: string) =>
    ["chat-conversation", notebookId] as const,
  chatMessages: (notebookId: string) => ["chat-messages", notebookId] as const,
  mindmap: (notebookId: string) => ["mindmap", notebookId] as const,
  flashcards: (notebookId: string) => ["flashcards", notebookId] as const,
  reportsConfig: (notebookId: string) => ["reports-config", notebookId] as const,
  reportsHistory: (notebookId: string) => ["reports-history", notebookId] as const,
  presentationsConfig: (notebookId: string) =>
    ["presentations-config", notebookId] as const,
  presentationsHistory: (notebookId: string) =>
    ["presentations-history", notebookId] as const,
};
