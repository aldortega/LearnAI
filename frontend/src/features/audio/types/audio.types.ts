export type AudioFormatType = "deep_dive" | "brief" | "critique" | "debate";

export type AudioDuration = "short" | "default" | "long";

export type AudioFormatTemplate = {
  type: AudioFormatType;
  label: string;
  description: string;
};

export type AudioSuggestion = {
  id: string;
  title: string;
  description: string;
  default_topic: string;
};

export type AudioSuggestionsStatus = "ready" | "generating" | "failed" | "missing";

export type AudioConfigOut = {
  has_ready_sources: boolean;
  templates: AudioFormatTemplate[];
  suggestions: AudioSuggestion[];
  suggestions_status: AudioSuggestionsStatus;
  suggestions_is_stale: boolean;
  suggestions_error: string | null;
  suggestions_job_id: string | null;
};

export type AudioGenerateRequest = {
  format_type: AudioFormatType;
  duration: AudioDuration;
  topic?: string;
  suggestion_id?: string;
};

export type AudioGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  podcast_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type AudioSuggestionsJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type AudioSourceRef = {
  document_id: string;
  chunk_id: number;
  score: number;
  file_name?: string | null;
  page?: number | null;
};

export type AudioScriptSegment = {
  speaker: string;
  text: string;
};

export type PodcastOut = {
  id: string;
  notebook_id: string;
  owner_id: string;
  format_type: AudioFormatType;
  duration: AudioDuration;
  title: string;
  description: string;
  topic: string;
  audio_url: string;
  audio_path: string;
  duration_seconds: number;
  sources_fingerprint: string;
  is_stale: boolean;
  sources: AudioSourceRef[];
  created_at: string;
};

export type PodcastDetailOut = PodcastOut & {
  script: AudioScriptSegment[];
};

export type PodcastListOut = {
  items: PodcastOut[];
};
