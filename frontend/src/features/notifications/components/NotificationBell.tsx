import { Bell, Check, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { collaborationApi } from "../../notebooks/api/collaborationApi";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { notificationsApi } from "../api/notificationsApi";
import type { NotificationItem } from "../types/notifications.types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await notificationsApi.unreadCount();
      setUnreadCount(response.unread_count);
    } catch {
      // Keep current badge value if request fails.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await notificationsApi.list();
      setItems(response.items);
    } catch (e) {
      setError(toNotebookErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const interval = window.setInterval(() => {
      void refreshUnread();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [refreshUnread]);

  useEffect(() => {
    if (!isOpen) return;
    void loadNotifications();
    void refreshUnread();
  }, [isOpen, loadNotifications, refreshUnread]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsApi.markRead(notificationId);
      } catch {
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item,
        ),
      );
      void refreshUnread();
    },
    [refreshUnread],
  );

  const handleInvitationAction = useCallback(
    async (item: NotificationItem, action: "accept" | "reject") => {
      if (!item.invitation) return;

      setActionId(item.id);
      setError(null);
      try {
        if (action === "accept") {
          await collaborationApi.acceptInvitation(item.invitation.invitation_id);
        } else {
          await collaborationApi.rejectInvitation(item.invitation.invitation_id);
        }
        setItems((current) => current.filter((currentItem) => currentItem.id !== item.id));
        await Promise.all([loadNotifications(), refreshUnread()]);
        window.dispatchEvent(new Event("notebook-collaboration-changed"));
      } catch (e) {
        setError(toNotebookErrorMessage(e));
      } finally {
        setActionId(null);
      }
    },
    [loadNotifications, refreshUnread],
  );

  const hasPendingInvitations = useMemo(
    () => items.some((item) => item.invitation?.status === "pending"),
    [items],
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-semibold leading-none text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-96 rounded-lg border border-border bg-surface shadow-lg ring-1 ring-black/5">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Invitaciones</p>
            {hasPendingInvitations ? (
              <span className="text-xs text-muted-foreground">Pendientes</span>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto p-3">
            {error ? (
              <p role="alert" className="mb-2 text-sm text-error">
                {error}
              </p>
            ) : null}

            {isLoading ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">Cargando...</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No tienes invitaciones nuevas.
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((item) => {
                  const invitation = item.invitation;
                  const isPending = invitation?.status === "pending";
                  const isActionLoading = actionId === item.id;

                  return (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border bg-muted/50 px-3 py-2"
                    >
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(item.created_at)}
                        </span>

                        {isPending ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void handleInvitationAction(item, "reject")}
                              disabled={isActionLoading}
                              className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <X className="mr-1 h-3 w-3" />
                              Rechazar
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleInvitationAction(item, "accept")}
                              disabled={isActionLoading}
                              className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Aceptar
                            </button>
                          </div>
                        ) : item.is_read ? null : (
                          <button
                            type="button"
                            onClick={() => void handleMarkRead(item.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Marcar como leida
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

