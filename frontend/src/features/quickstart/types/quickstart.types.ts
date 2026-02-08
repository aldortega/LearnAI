export type QuickstartTopic = {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
};

export type QuickstartOut = {
  notebook_id: string;
  has_ready_sources: boolean;
  status: "missing" | "ready" | "stale";
  generated_at?: string | null;
  notebook_summary: string;
  topics: QuickstartTopic[];
};

export type QuickstartGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type QuickstartSourceRef = {
  document_id: string;
  chunk_id: number;
  score: number;
  file_name?: string | null;
  page?: number | null;
};

export type QuickstartExpansionOut = {
  topic_id: string;
  content: string;
  key_points: string[];
  example_questions: string[];
  sources: QuickstartSourceRef[];
};

export type QuickstartSuggestionsOut = {
  suggestions: string[];
  topic_count: number;
  topic_limit: number;
  can_add_topics: boolean;
};
