export type Notebook = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
};

export type NotebookCreate = {
  title: string;
  description?: string | null;
};

export type NotebookUpdate = {
  title?: string;
  description?: string | null;
};
