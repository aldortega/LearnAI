import { useSyncExternalStore } from "react";

import type { Document } from "../types/documents.types";

type Snapshot = {
  documents: Document[];
  isStreaming: boolean;
  error: string | null;
  hasSnapshot: boolean;
};

type StoreState = {
  documentsByNotebookId: Map<string, Document[]>;
  hasSnapshotByNotebookId: Map<string, boolean>;
  streamingByNotebookId: Map<string, boolean>;
  errorByNotebookId: Map<string, string | null>;
};

const storeState: StoreState = {
  documentsByNotebookId: new Map(),
  hasSnapshotByNotebookId: new Map(),
  streamingByNotebookId: new Map(),
  errorByNotebookId: new Map(),
};

const listeners = new Set<() => void>();

const emptyDocuments: Document[] = [];
const emptySnapshot: Snapshot = {
  documents: emptyDocuments,
  isStreaming: false,
  error: null,
  hasSnapshot: false,
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
  const hasSnapshot = storeState.hasSnapshotByNotebookId.get(notebookId) ?? false;
  const isStreaming = storeState.streamingByNotebookId.get(notebookId) ?? false;
  const error = storeState.errorByNotebookId.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);

  if (
    cached &&
    cached.documents === documents &&
    cached.hasSnapshot === hasSnapshot &&
    cached.isStreaming === isStreaming &&
    cached.error === error
  ) {
    return cached;
  }

  const snapshot = { documents, isStreaming, error, hasSnapshot };
  snapshotCache.set(notebookId, snapshot);
  return snapshot;
}

export function setNotebookDocuments(notebookId: string, documents: Document[]) {
  storeState.documentsByNotebookId.set(notebookId, documents);
  storeState.hasSnapshotByNotebookId.set(notebookId, true);
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
