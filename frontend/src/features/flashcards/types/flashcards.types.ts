export type FlashcardCountPreset = "less" | "default" | "more";
export type FlashcardDifficulty = "easy" | "medium" | "hard";

export type FlashcardsGenerateRequest = {
  card_count?: FlashcardCountPreset;
  difficulty?: FlashcardDifficulty;
  topic_prompt?: string;
};

export type FlashcardOut = {
  id: string;
  term: string;
  definition: string;
};

export type FlashcardsOut = {
  notebook_id: string;
  has_ready_sources: boolean;
  status: "missing" | "ready" | "stale";
  generated_at?: string | null;
  card_count: FlashcardCountPreset;
  difficulty: FlashcardDifficulty;
  topic_prompt: string;
  cards: FlashcardOut[];
};

export type FlashcardsGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type FlashcardExplainOut = {
  card_id: string;
  explanation_markdown: string;
  cached: boolean;
  generated_at: string;
};
