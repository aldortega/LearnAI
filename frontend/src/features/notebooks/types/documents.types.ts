export type DocumentStatus = "pending" | "processing" | "done" | "error" | "queued" | "failed";

export type Document = {
  id: string;
  owner_id: string;
  notebook_id: string;
  file_path: string;
  file_name: string;
  content_type: "pdf" | "docx" | "txt" | "pptx";
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  error?: string | null;
};

export type DocumentCreateResponse = {
  document: Document;
  job_id: string;
};
