export type ReportFormatType =
  | "freeform"
  | "summary"
  | "study_guide"
  | "blog_post"
  | "ai_suggested";

export type ReportPromptTemplate = {
  type: ReportFormatType;
  label: string;
  description: string;
  default_prompt: string;
  is_editable: boolean;
};

export type ReportSuggestion = {
  id: string;
  title: string;
  description: string;
  default_prompt: string;
};

export type ReportConfigOut = {
  has_ready_sources: boolean;
  templates: ReportPromptTemplate[];
  suggestions: ReportSuggestion[];
};

export type ReportGenerateRequest = {
  format_type: ReportFormatType;
  prompt: string;
  suggestion_id?: string;
};

export type ReportGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  report_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type ReportSourceRef = {
  document_id: string;
  chunk_id: number;
  score: number;
  file_name?: string | null;
  page?: number | null;
};

export type ReportOut = {
  id: string;
  notebook_id: string;
  owner_id: string;
  format_type: ReportFormatType;
  title: string;
  prompt_used: string;
  content: string;
  sources_fingerprint: string;
  is_stale: boolean;
  sources: ReportSourceRef[];
  created_at: string;
};

export type ReportListOut = {
  items: ReportOut[];
};
