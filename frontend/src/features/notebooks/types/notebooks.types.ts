export type Notebook = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  emoji?: string | null;
  source_count: number;
  created_at: string;
  updated_at: string;
};

export type NotebookCreate = {
  title: string;
  description?: string | null;
  emoji?: string | null;
};

export type NotebookUpdate = {
  title?: string;
  description?: string | null;
  emoji?: string | null;
};
