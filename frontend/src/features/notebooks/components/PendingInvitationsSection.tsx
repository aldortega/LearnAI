import type { NotebookInvite } from "../types/collaboration.types";
import { getDisplayName, getInitials, getPermissionLabel } from "../utils/collaborationDisplay";

type Props = {
  isLoading: boolean;
  pendingInvitations: NotebookInvite[];
};

export function PendingInvitationsSection({ isLoading, pendingInvitations }: Props) {
  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Invitaciones pendientes</p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando invitaciones...</p>
      ) : pendingInvitations.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay invitaciones pendientes.</p>
      ) : (
        <ul className="max-h-36 space-y-2 overflow-y-auto">
          {pendingInvitations.map((item) => {
            const displayName = getDisplayName(
              item.invitee_name,
              item.invitee_last_name,
              item.invitee_username,
            );

            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
              >
                <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {item.invitee_avatar_url ? (
                    <img
                      src={item.invitee_avatar_url}
                      alt={`Avatar de ${displayName}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(displayName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.invitee_email || `@${item.invitee_username}`}</p>
                </div>
                <span
                  className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                  aria-label={`Rol ${getPermissionLabel(item.permission)}`}
                >
                  {getPermissionLabel(item.permission)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
