import { useSyncExternalStore } from "react";

import type { Notebook } from "../types/notebooks.types";

type StoreState = {
  notebooksById: Map<string, Notebook>;
};

const storeState: StoreState = {
  notebooksById: new Map(),
};

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, Notebook | null>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): Notebook | null {
  if (!notebookId) {
    return null;
  }

  const notebook = storeState.notebooksById.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);

  if (cached === notebook) {
    return cached;
  }

  snapshotCache.set(notebookId, notebook);
  return notebook;
}

export function setNotebook(notebookId: string, notebook: Notebook) {
  storeState.notebooksById.set(notebookId, notebook);
  emitChange();
}

export function useNotebookStore(notebookId?: string): Notebook | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
