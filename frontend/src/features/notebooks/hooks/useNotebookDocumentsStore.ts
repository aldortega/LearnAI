import { useSyncExternalStore } from "react";

import type { Document } from "../types/documents.types";

type Snapshot = {
  documents: Document[];
  isStreaming: boolean;
  error: string | null;
};

type StoreState = {
  documentsByNotebookId: Map<string, Document[]>;
  streamingByNotebookId: Map<string, boolean>;
  errorByNotebookId: Map<string, string | null>;
};

const storeState: StoreState = {
  documentsByNotebookId: new Map(),
  streamingByNotebookId: new Map(),
  errorByNotebookId: new Map(),
};

const listeners = new Set<() => void>();

const emptyDocuments: Document[] = [];
const emptySnapshot: Snapshot = {
  documents: emptyDocuments,
  isStreaming: false,
  error: null,
};
const snapshotCache = new Map<string, Snapshot>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): Snapshot {
  if (!notebookId) {
    return emptySnapshot;
  }

  const documents = storeState.documentsByNotebookId.get(notebookId) ?? emptyDocuments;
  const isStreaming = storeState.streamingByNotebookId.get(notebookId) ?? false;
  const error = storeState.errorByNotebookId.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);

  if (
    cached &&
    cached.documents === documents &&
    cached.isStreaming === isStreaming &&
    cached.error === error
  ) {
    return cached;
  }

  const snapshot = { documents, isStreaming, error };
  snapshotCache.set(notebookId, snapshot);
  return snapshot;
}

export function setNotebookDocuments(notebookId: string, documents: Document[]) {
  storeState.documentsByNotebookId.set(notebookId, documents);
  emitChange();
}

export function setNotebookStreaming(notebookId: string, isStreaming: boolean) {
  storeState.streamingByNotebookId.set(notebookId, isStreaming);
  emitChange();
}

export function setNotebookDocumentsError(
  notebookId: string,
  error: string | null,
) {
  storeState.errorByNotebookId.set(notebookId, error);
  emitChange();
}

export function useNotebookDocumentsStore(notebookId?: string): Snapshot {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
