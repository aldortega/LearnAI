import { apiRequest } from "../../../shared/lib/apiClient";
import type {
  NotificationListOut,
  NotificationUnreadCountOut,
} from "../types/notifications.types";

export const notificationsApi = {
  list: async (): Promise<NotificationListOut> => {
    return apiRequest<NotificationListOut>("/notifications", {
      method: "GET",
    });
  },

  unreadCount: async (): Promise<NotificationUnreadCountOut> => {
    return apiRequest<NotificationUnreadCountOut>("/notifications/unread-count", {
      method: "GET",
    });
  },

  markRead: async (notificationId: string): Promise<void> => {
    await apiRequest<void>(`/notifications/${notificationId}/read`, {
      method: "POST",
    });
  },
};

