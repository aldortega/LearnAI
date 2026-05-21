export type GenerationKind =
  | "quickstart"
  | "quiz_roadmap"
  | "mindmap"
  | "flashcards"
  | "presentations"
  | "reports"
  | "audio";

export type GenerationStatus = "queued" | "processing" | "done" | "failed";

export type GenerationJobBase = {
  job_id: string;
  status: GenerationStatus;
  error?: string | null;
};

export type TrackedGenerationJob = {
  key: string;
  ownerId: string;
  notebookId: string;
  kind: GenerationKind;
  jobId: string;
  status: GenerationStatus;
  error: string | null;
  trackedAt: number;
  updatedAt: number;
  terminalPayload?: GenerationJobBase;
};

export function buildGenerationJobKey(
  kind: GenerationKind,
  notebookId: string,
  jobId: string,
): string {
  return `${kind}:${notebookId}:${jobId}`;
}
