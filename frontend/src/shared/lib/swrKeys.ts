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
  quickstartExpansion: (notebookId: string, topicId: string) =>
    ["quickstart-expansion", notebookId, topicId] as const,
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
  audioConfig: (notebookId: string) => ["audio-config", notebookId] as const,
  audioHistory: (notebookId: string) => ["audio-history", notebookId] as const,
  podcastDetail: (notebookId: string, podcastId: string) =>
    ["podcast-detail", notebookId, podcastId] as const,
  reportDetail: (notebookId: string, reportId: string) =>
    ["report-detail", notebookId, reportId] as const,
  presentationDetail: (notebookId: string, presentationId: string) =>
    ["presentation-detail", notebookId, presentationId] as const,
  quizAttempts: (notebookId: string, levelId: string) =>
    ["quiz-attempts", notebookId, levelId] as const,
  quizQuestions: (notebookId: string, levelId: string) =>
    ["quiz-questions", notebookId, levelId] as const,
  userSearch: (query: string) => ["user-search", query] as const,
  notebookInvitations: (notebookId: string) =>
    ["notebook-invitations", notebookId] as const,
  notifications: () => ["notifications"] as const,
  notificationsUnreadCount: () => ["notifications-unread-count"] as const,
};
