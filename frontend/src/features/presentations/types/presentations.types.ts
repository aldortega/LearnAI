export type PresentationDetailLevel = "concise" | "detailed";
export type PresentationGenerationMode = "text" | "image";
export type PresentationSlideFormat = "markdown" | "image";

export type PresentationConfigOut = {
  has_ready_sources: boolean;
};

export type PresentationGenerateRequest = {
  topic: string;
  detail_level: PresentationDetailLevel;
  generation_mode: PresentationGenerationMode;
};

export type PresentationRegenerateSlideRequest = {
  prompt: string;
};

export type PresentationApplySlideRequest = {
  title: string;
  subtitle?: string | null;
  content_markdown: string;
};

export type PresentationRegenerateSlideOut = {
  slide: PresentationSlide;
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
  format: PresentationSlideFormat;
  title: string;
  subtitle?: string | null;
  content_markdown?: string | null;
  image_path?: string | null;
  image_url?: string | null;
  image_prompt?: string | null;
};

export type PresentationOut = {
  id: string;
  notebook_id: string;
  owner_id: string;
  topic: string;
  detail_level: PresentationDetailLevel;
  generation_mode: PresentationGenerationMode;
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
