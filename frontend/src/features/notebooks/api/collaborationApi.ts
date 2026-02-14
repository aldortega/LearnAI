import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  NotebookInvite,
  NotebookInviteCreate,
  UserSearchItem,
} from "../types/collaboration.types";

export const collaborationApi = {
  searchUsers: async (username: string): Promise<UserSearchItem[]> => {
    const query = encodeURIComponent(username.trim());
    return apiRequest<UserSearchItem[]>(`/users/search?username=${query}`, {
      method: "GET",
    });
  },

  createInvitation: async (
    notebookId: string,
    payload: NotebookInviteCreate,
  ): Promise<NotebookInvite> => {
    return apiRequest<NotebookInvite>(`/notebooks/${notebookId}/invitations`, {
      method: "POST",
      body: payload,
    });
  },

  listInvitations: async (notebookId: string): Promise<NotebookInvite[]> => {
    return apiRequest<NotebookInvite[]>(`/notebooks/${notebookId}/invitations`, {
      method: "GET",
    });
  },

  updateMemberPermission: async (
    notebookId: string,
    memberId: string,
    permission: "read_only" | "can_manage_documents",
  ): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/members/${memberId}/permission`, {
      method: "PATCH",
      body: { permission },
    });
  },

  revokeMember: async (notebookId: string, memberId: string): Promise<void> => {
    await apiRequest<void>(`/notebooks/${notebookId}/members/${memberId}/revoke`, {
      method: "POST",
    });
  },

  acceptInvitation: async (invitationId: string): Promise<NotebookInvite> => {
    return apiRequest<NotebookInvite>(`/invitations/${invitationId}/accept`, {
      method: "POST",
    });
  },

  rejectInvitation: async (invitationId: string): Promise<NotebookInvite> => {
    return apiRequest<NotebookInvite>(`/invitations/${invitationId}/reject`, {
      method: "POST",
    });
  },
};

