export type NotificationInvitation = {
  invitation_id: string;
  notebook_id: string;
  notebook_title: string;
  owner_id: string;
  owner_username: string;
  owner_display_name: string;
  permission: "read_only" | "can_manage_documents";
  status: "pending" | "accepted" | "rejected" | "revoked" | "expired";
  expires_at: string;
};

export type NotificationItem = {
  id: string;
  type: "notebook_invitation";
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
  invitation?: NotificationInvitation | null;
};

export type NotificationListOut = {
  items: NotificationItem[];
};

export type NotificationUnreadCountOut = {
  unread_count: number;
};

