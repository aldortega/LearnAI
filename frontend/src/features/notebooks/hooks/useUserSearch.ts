import { useEffect, useState } from "react";

import { collaborationApi } from "../api/collaborationApi";
import type { UserSearchItem } from "../types/collaboration.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

type Result = {
  users: UserSearchItem[];
  isLoading: boolean;
  error: string | null;
};

export function useUserSearch(query: string, enabled: boolean): Result {
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const value = query.trim();
    if (!enabled || value.length < 2) {
      setUsers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const timeout = window.setTimeout(async () => {
      try {
        const data = await collaborationApi.searchUsers(value);
        if (active) {
          setUsers(data);
        }
      } catch (e) {
        if (active) {
          setUsers([]);
          setError(toNotebookErrorMessage(e));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [query, enabled]);

  return { users, isLoading, error };
}

