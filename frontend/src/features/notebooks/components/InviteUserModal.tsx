import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import { collaborationApi } from "../api/collaborationApi";
import { InviteeAutocompleteField } from "./InviteeAutocompleteField";
import { useInviteUser } from "../hooks/useInviteUser";
import { useUserSearch } from "../hooks/useUserSearch";
import type {
  InvitationPermission,
  NotebookInvite,
} from "../types/collaboration.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Props = {
  isOpen: boolean;
  notebookId: string | null;
  notebookTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
};

const permissionOptions: Array<{
  value: InvitationPermission;
  label: string;
  description: string;
}> = [
  {
    value: "read_only",
    label: "Solo lectura",
    description: "Puede usar el studio, pero no subir ni eliminar documentos.",
  },
  {
    value: "can_manage_documents",
    label: "Gestionar documentos",
    description: "Puede subir y eliminar documentos en esta notebook.",
  },
];

function formatPermission(value: InvitationPermission): string {
  return value === "can_manage_documents" ? "Gestionar documentos" : "Solo lectura";
}

function formatStatus(value: NotebookInvite["status"]): string {
  if (value === "pending") return "Pendiente";
  if (value === "accepted") return "Aceptada";
  if (value === "rejected") return "Rechazada";
  if (value === "revoked") return "Revocada";
  return "Expirada";
}

export function InviteUserModal({
  isOpen,
  notebookId,
  notebookTitle,
  onClose,
  onSuccess,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [permission, setPermission] =
    useState<InvitationPermission>("read_only");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [invitations, setInvitations] = useState<NotebookInvite[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [revokingMemberId, setRevokingMemberId] = useState<string | null>(null);

  const { invite, isLoading, error } = useInviteUser();
  const { users, isLoading: isSearching, error: searchError } = useUserSearch(
    searchQuery,
    isOpen,
  );

  const reloadInvitations = useCallback(async () => {
    if (!notebookId) {
      setInvitations([]);
      return;
    }

    setIsLoadingInvitations(true);
    setInvitationError(null);
    try {
      const data = await collaborationApi.listInvitations(notebookId);
      setInvitations(data);
    } catch (e) {
      setInvitationError(toNotebookErrorMessage(e));
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [notebookId]);

  useEffect(() => {
    if (!isOpen || !notebookId) return;
    void reloadInvitations();
  }, [isOpen, notebookId, reloadInvitations]);

  useEffect(() => {
    if (isOpen) return;
    setSearchQuery("");
    setSelectedUsername("");
    setHasSubmitted(false);
  }, [isOpen]);

  const normalizedQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );

  const exactMatch = useMemo(
    () => users.find((userItem) => userItem.username.toLowerCase() === normalizedQuery),
    [normalizedQuery, users],
  );

  const resolvedInviteeUsername = useMemo(
    () => selectedUsername.trim() || exactMatch?.username || "",
    [selectedUsername, exactMatch],
  );

  const canSubmit = useMemo(() => {
    return Boolean(notebookId) && resolvedInviteeUsername.length >= 3 && !isLoading;
  }, [notebookId, resolvedInviteeUsername, isLoading]);

  const activeInvitations = useMemo(
    () => invitations.filter((item) => item.status === "pending" || item.status === "accepted"),
    [invitations],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);

    const inviteeUsername = resolvedInviteeUsername;
    if (!notebookId || inviteeUsername.length < 3) return;

    const result = await invite(notebookId, inviteeUsername, permission);
    if (!result) return;

    onSuccess();
    onClose();
  };

  const handleRevoke = async (memberId: string) => {
    if (!notebookId) return;

    setRevokingMemberId(memberId);
    setInvitationError(null);
    try {
      await collaborationApi.revokeMember(notebookId, memberId);
      await reloadInvitations();
      onSuccess();
    } catch (e) {
      setInvitationError(toNotebookErrorMessage(e));
    } finally {
      setRevokingMemberId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={notebookTitle ? `Invitar a ${notebookTitle}` : "Invitar usuario"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-error bg-error/10 px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        ) : null}

        <InviteeAutocompleteField
          searchQuery={searchQuery}
          selectedUsername={selectedUsername}
          users={users}
          isSearching={isSearching}
          searchError={searchError}
          showValidationError={hasSubmitted && !canSubmit}
          onSearchQueryChange={setSearchQuery}
          onSelectedUsernameChange={setSelectedUsername}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Permiso del invitado</p>
          <div className="space-y-2">
            {permissionOptions.map((option) => {
              const isSelected = permission === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPermission(option.value)}
                  className={
                    "w-full rounded-lg border px-3 py-2 text-left transition " +
                    (isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:bg-muted")
                  }
                >
                  <p className="text-sm font-medium text-foreground">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" loading={isLoading} disabled={!canSubmit}>
            Enviar invitacion
          </Button>
        </div>
      </form>

      <div className="mt-6 border-t border-border pt-4">
        <p className="mb-2 text-sm font-semibold text-foreground">Accesos actuales</p>
        {invitationError ? (
          <p role="alert" className="mb-2 text-xs text-error">
            {invitationError}
          </p>
        ) : null}

        {isLoadingInvitations ? (
          <p className="text-xs text-muted-foreground">Cargando accesos...</p>
        ) : activeInvitations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No hay invitaciones activas.</p>
        ) : (
          <ul className="max-h-36 space-y-2 overflow-y-auto">
            {activeInvitations.map((item) => (
              <li key={item.id} className="rounded-lg border border-border bg-muted/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">@{item.invitee_username}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatStatus(item.status)} · {formatPermission(item.permission)}
                    </p>
                  </div>
                  {item.status === "accepted" ? (
                    <button
                      type="button"
                      onClick={() => void handleRevoke(item.invitee_id)}
                      disabled={revokingMemberId === item.invitee_id}
                      className="rounded-md border border-border px-2 py-1 text-xs text-error transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {revokingMemberId === item.invitee_id ? "Revocando..." : "Revocar"}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
