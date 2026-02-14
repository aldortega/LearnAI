import { ChevronDown } from "lucide-react";
import type { User } from "../../auth/types/auth.types";
import type { NotebookInvite } from "../types/collaboration.types";
import type { MemberAction } from "../types/collaboration-ui.types";
import { getDisplayName, getInitials } from "../utils/collaborationDisplay";

type Props = {
  isLoading: boolean;
  error: string | null;
  owner: User | null;
  acceptedInvitations: NotebookInvite[];
  memberActions: Record<string, MemberAction>;
  isApplyingChanges: boolean;
  onMemberActionChange: (memberId: string, action: MemberAction) => void;
};

export function AccessPeopleSection({
  isLoading,
  error,
  owner,
  acceptedInvitations,
  memberActions,
  isApplyingChanges,
  onMemberActionChange,
}: Props) {
  const ownerDisplayName = `${owner?.name ?? ""} ${owner?.last_name ?? ""}`.trim() || owner?.email || "Propietario";

  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="mb-3 text-sm font-semibold text-foreground">Personas con acceso</p>
      {error ? (
        <p role="alert" className="mb-3 text-xs text-error">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando accesos...</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          <li className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {owner?.avatar_url ? (
                <img
                  src={owner.avatar_url}
                  alt={`Avatar de ${ownerDisplayName}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(ownerDisplayName)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{ownerDisplayName}</p>
              <p className="truncate text-xs text-muted-foreground">{owner?.email ?? ""}</p>
            </div>
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Propietario
            </span>
          </li>

          {acceptedInvitations.map((item) => {
            const selectedAction = memberActions[item.invitee_id] ?? item.permission;
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
                  <p className="truncate text-xs text-muted-foreground">
                    {item.invitee_email || `@${item.invitee_username}`}
                  </p>
                </div>
                <div className="relative">
                  <select
                    value={selectedAction}
                    onChange={(event) =>
                      onMemberActionChange(item.invitee_id, event.target.value as MemberAction)
                    }
                    disabled={isApplyingChanges}
                    className={
                      "h-9 appearance-none rounded-lg border bg-surface pl-2 pr-8 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary " +
                      (selectedAction === "remove"
                        ? "border-error text-error"
                        : "border-border text-foreground")
                    }
                  >
                    <option value="read_only">Lector</option>
                    <option value="can_manage_documents">Editor</option>
                    <option value="remove">Eliminar</option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
