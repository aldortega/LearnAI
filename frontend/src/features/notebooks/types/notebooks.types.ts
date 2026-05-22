export type Notebook = {
  id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  emoji?: string | null;
  access_role: "owner" | "collaborator";
  can_manage_documents: boolean;
  source_count: number;
  created_at: string;
  updated_at: string;
};

export type NotebookCreate = {
  title: string;
};

export type NotebookUpdate = {
  title?: string;
  description?: string | null;
  emoji?: string | null;
};
