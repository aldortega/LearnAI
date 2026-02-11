export type MindmapNodeOut = {
  id: string;
  title: string;
  parent_id?: string | null;
  depth: number;
  has_children: boolean;
};

export type MindmapOut = {
  notebook_id: string;
  has_ready_sources: boolean;
  status: "missing" | "ready" | "stale";
  generated_at?: string | null;
  root_node_id?: string | null;
  nodes: MindmapNodeOut[];
};

export type MindmapGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type MindmapNodeDetailOut = {
  node_id: string;
  explanation: string;
};
