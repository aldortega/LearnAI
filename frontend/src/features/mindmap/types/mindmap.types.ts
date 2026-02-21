export type MindmapNodeOut = {
  id: string;
  title: string;
  parent_id?: string | null;
  depth: number;
  has_children: boolean;
};

export type MindmapGenerationMetaOut = {
  generated_nodes: number;
  discarded_empty: number;
  discarded_duplicate: number;
  discarded_limit: number;
  used_contextual_fallback: boolean;
  used_generic_fallback: boolean;
};

export type MindmapOut = {
  notebook_id: string;
  has_ready_sources: boolean;
  status: "missing" | "ready" | "stale";
  generated_at?: string | null;
  root_node_id?: string | null;
  nodes: MindmapNodeOut[];
  generation_meta?: MindmapGenerationMetaOut | null;
};

export type MindmapGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type MindmapGenerateRequest = {
  prompt?: string;
};

export type MindmapNodeDetailOut = {
  node_id: string;
  explanation: string;
};
