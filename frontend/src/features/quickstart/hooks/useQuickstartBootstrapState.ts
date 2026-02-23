import { useMemo } from "react";

import type { QuickstartOut } from "../types/quickstart.types";

type Params = {
  isNotebookLoading: boolean;
  isResolvingReadySources: boolean;
  quickstart: QuickstartOut | null;
  error: string | null;
};

export function useQuickstartBootstrapState({
  isNotebookLoading,
  isResolvingReadySources,
  quickstart,
  error,
}: Params): boolean {
  return useMemo(
    () =>
      isNotebookLoading ||
      isResolvingReadySources ||
      (!quickstart && !error),
    [isNotebookLoading, isResolvingReadySources, quickstart, error],
  );
}
