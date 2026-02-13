export type InvitationPermission = "read_only" | "can_manage_documents";

export type UserSearchItem = {
  id: string;
  username: string;
  name: string;
  last_name: string;
};

export type NotebookInviteCreate = {
  invitee_username: string;
  permission: InvitationPermission;
};

export type NotebookInvite = {
  id: string;
  notebook_id: string;
  owner_id: string;
  invitee_id: string;
  invitee_username: string;
  permission: InvitationPermission;
  status: "pending" | "accepted" | "rejected" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
  updated_at: string;
  responded_at?: string | null;
};

