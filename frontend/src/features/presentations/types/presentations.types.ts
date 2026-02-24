export type PresentationStyle =
  | "clean"
  | "corporate"
  | "creative"
  | "academic"
  | "minimal";

export type PresentationDetailLevel = "concise" | "detailed";

export type PresentationStyleTemplate = {
  style: PresentationStyle;
  label: string;
  description: string;
};

export type PresentationConfigOut = {
  has_ready_sources: boolean;
  styles: PresentationStyleTemplate[];
};

export type PresentationGenerateRequest = {
  topic: string;
  style: PresentationStyle;
  detail_level: PresentationDetailLevel;
};

export type PresentationGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  presentation_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type PresentationSourceRef = {
  document_id: string;
  chunk_id: number;
  score: number;
  file_name?: string | null;
  page?: number | null;
};

export type PresentationSlide = {
  index: number;
  title: string;
  subtitle?: string | null;
  content_markdown: string;
};

export type PresentationOut = {
  id: string;
  notebook_id: string;
  owner_id: string;
  topic: string;
  style: PresentationStyle;
  detail_level: PresentationDetailLevel;
  title: string;
  summary: string;
  slides: PresentationSlide[];
  sources_fingerprint: string;
  is_stale: boolean;
  sources: PresentationSourceRef[];
  created_at: string;
};

export type PresentationListOut = {
  items: PresentationOut[];
};
