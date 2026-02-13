import { useCallback, useState } from "react";

import { collaborationApi } from "../api/collaborationApi";
import type {
  InvitationPermission,
  NotebookInvite,
} from "../types/collaboration.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  invite: (
    notebookId: string,
    inviteeUsername: string,
    permission: InvitationPermission,
  ) => Promise<NotebookInvite | null>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
};

export function useInviteUser(): Result {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const invite = useCallback(
    async (
      notebookId: string,
      inviteeUsername: string,
      permission: InvitationPermission,
    ): Promise<NotebookInvite | null> => {
      setIsLoading(true);
      setError(null);

      try {
        return await collaborationApi.createInvitation(notebookId, {
          invitee_username: inviteeUsername,
          permission,
        });
      } catch (e) {
        setError(toNotebookErrorMessage(e));
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { invite, isLoading, error, clearError };
}

