import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import { useAuth } from "../../../shared/hooks/useAuth";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import { collaborationApi } from "../api/collaborationApi";
import { useInviteUser } from "../hooks/useInviteUser";
import { useUserSearch } from "../hooks/useUserSearch";
import type { InvitationPermission, NotebookInvite } from "../types/collaboration.types";
import type { MemberAction } from "../types/collaboration-ui.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";
import { AccessPeopleSection } from "./AccessPeopleSection";
import { InviteUserInlineForm } from "./InviteUserInlineForm";
import { PendingInvitationsSection } from "./PendingInvitationsSection";

type Props = {
  isOpen: boolean;
  notebookId: string | null;
  notebookTitle?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function InviteUserModal({
  isOpen,
  notebookId,
  notebookTitle,
  onClose,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsername, setSelectedUsername] = useState("");
  const [permission, setPermission] = useState<InvitationPermission>("read_only");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [memberActionOverrides, setMemberActionOverrides] = useState<
    Record<string, MemberAction>
  >({});
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  const { invite, isLoading, error, clearError } = useInviteUser();
  const { users, isLoading: isSearching, error: searchError } = useUserSearch(searchQuery, isOpen);

  const {
    data: invitations,
    error: invitationsSwrError,
    isLoading: isLoadingInvitations,
    mutate: mutateInvitations,
  } = useSWR<NotebookInvite[]>(
    isOpen && notebookId ? swrKeys.notebookInvitations(notebookId) : null,
    () => collaborationApi.listInvitations(notebookId as string),
  );

  const reloadInvitations = useCallback(async () => {
    if (!notebookId) return;
    setInvitationError(null);
    try {
      await mutateInvitations();
    } catch (e) {
      setInvitationError(toNotebookErrorMessage(e));
    }
  }, [mutateInvitations, notebookId]);

  const handleRequestClose = useCallback(() => {
    setSearchQuery("");
    setSelectedUsername("");
    setPermission("read_only");
    setHasSubmitted(false);
    setInvitationError(null);
    setMemberActionOverrides({});
    clearError();
    onClose();
  }, [clearError, onClose]);

  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const exactMatch = useMemo(
    () => users.find((item) => item.email.toLowerCase() === normalizedQuery),
    [normalizedQuery, users],
  );

  const resolvedInviteeUsername = useMemo(() => {
    return selectedUsername.trim() || exactMatch?.username || "";
  }, [selectedUsername, exactMatch]);

  const isInviteeValid = useMemo(() => resolvedInviteeUsername.length >= 3, [resolvedInviteeUsername]);

  const canSubmit = useMemo(() => {
    return Boolean(notebookId) && isInviteeValid && !isLoading;
  }, [isInviteeValid, isLoading, notebookId]);

  const acceptedInvitations = useMemo(
    () => (invitations ?? []).filter((item) => item.status === "accepted"),
    [invitations],
  );

  const pendingInvitations = useMemo(
    () => (invitations ?? []).filter((item) => item.status === "pending"),
    [invitations],
  );

  const memberActions = useMemo(() => {
    const next: Record<string, MemberAction> = {};
    for (const item of acceptedInvitations) {
      next[item.invitee_id] = memberActionOverrides[item.invitee_id] ?? item.permission;
    }
    return next;
  }, [acceptedInvitations, memberActionOverrides]);

  const pendingChanges = useMemo(() => {
    return acceptedInvitations
      .map((item) => {
        const action = memberActions[item.invitee_id] ?? item.permission;
        return {
          memberId: item.invitee_id,
          action,
          currentPermission: item.permission,
        };
      })
      .filter((item) => item.action === "remove" || item.action !== item.currentPermission);
  }, [acceptedInvitations, memberActions]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setHasSubmitted(true);
    clearError();

    if (!notebookId || resolvedInviteeUsername.length < 3) return;

    const result = await invite(notebookId, resolvedInviteeUsername, permission);
    if (!result) return;

    setSearchQuery("");
    setSelectedUsername("");
    setHasSubmitted(false);
    setInvitationError(null);
    await reloadInvitations();
    onSuccess();
  };

  const handleAcceptChanges = async () => {
    if (!notebookId || pendingChanges.length === 0) return;

    setIsApplyingChanges(true);
    setInvitationError(null);
    try {
      for (const change of pendingChanges) {
        if (change.action === "remove") {
          await collaborationApi.revokeMember(notebookId, change.memberId);
          continue;
        }

        await collaborationApi.updateMemberPermission(notebookId, change.memberId, change.action);
      }

      setMemberActionOverrides({});
      await reloadInvitations();
      onSuccess();
    } catch (e) {
      setInvitationError(toNotebookErrorMessage(e));
    } finally {
      setIsApplyingChanges(false);
    }
  };

  const handleMemberActionChange = (memberId: string, action: MemberAction) => {
    setMemberActionOverrides((previous) => ({
      ...previous,
      [memberId]: action,
    }));
  };

  const displayedInvitationError =
    invitationError ?? (invitationsSwrError ? toNotebookErrorMessage(invitationsSwrError) : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleRequestClose}
      title={notebookTitle ? `Invitar a ${notebookTitle}` : "Invitar usuario"}
      maxWidth="3xl"
    >
      <InviteUserInlineForm
        searchQuery={searchQuery}
        selectedUsername={selectedUsername}
        users={users}
        isSearching={isSearching}
        searchError={searchError}
        permission={permission}
        isSubmitting={isLoading}
        canSubmit={canSubmit}
        showValidationError={hasSubmitted && !isInviteeValid}
        error={error}
        onSearchQueryChange={setSearchQuery}
        onSelectedUsernameChange={setSelectedUsername}
        onPermissionChange={setPermission}
        onSubmit={handleSubmit}
      />

      <AccessPeopleSection
        isLoading={isLoadingInvitations}
        error={displayedInvitationError}
        owner={user}
        acceptedInvitations={acceptedInvitations}
        memberActions={memberActions}
        isApplyingChanges={isApplyingChanges}
        onMemberActionChange={handleMemberActionChange}
      />

      <PendingInvitationsSection
        isLoading={isLoadingInvitations}
        pendingInvitations={pendingInvitations}
      />

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          onClick={() => void handleAcceptChanges()}
          loading={isApplyingChanges}
          disabled={pendingChanges.length === 0 || isLoadingInvitations}
          className="h-10 w-24"
        >
          Aceptar
        </Button>
      </div>
    </Modal>
  );
}
