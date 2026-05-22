import { useEffect, useState } from "react";
import useSWR from "swr";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { collaborationApi } from "../api/collaborationApi";
import type { UserSearchItem } from "../types/collaboration.types";
import { toNotebookErrorMessage } from "../utils/notebookErrors";

const DEBOUNCE_MS = 250;

type Result = {
  users: UserSearchItem[];
  isLoading: boolean;
  error: string | null;
};

export function useUserSearch(query: string, enabled: boolean): Result {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const value = query.trim();
    if (!enabled || value.length < 2) {
      const timeout = window.setTimeout(() => setDebouncedQuery(""), 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => setDebouncedQuery(value), DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [query, enabled]);

  const { data, error, isLoading } = useSWR<UserSearchItem[]>(
    debouncedQuery ? swrKeys.userSearch(debouncedQuery) : null,
    () => collaborationApi.searchUsers(debouncedQuery),
    { revalidateOnFocus: false, keepPreviousData: false },
  );

  return {
    users: debouncedQuery && data ? data : [],
    isLoading: Boolean(debouncedQuery) && isLoading && !data,
    error: error ? toNotebookErrorMessage(error) : null,
  };
}
