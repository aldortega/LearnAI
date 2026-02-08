import { useSyncExternalStore } from "react";

import type { QuickstartSuggestionsOut } from "../types/quickstart.types";

type StoreState = {
  suggestionsByNotebookId: Map<string, QuickstartSuggestionsOut>;
};

const storeState: StoreState = {
  suggestionsByNotebookId: new Map(),
};

const listeners = new Set<() => void>();
const snapshotCache = new Map<string, QuickstartSuggestionsOut | null>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(notebookId?: string): QuickstartSuggestionsOut | null {
  if (!notebookId) {
    return null;
  }

  const suggestions = storeState.suggestionsByNotebookId.get(notebookId) ?? null;
  const cached = snapshotCache.get(notebookId);
  if (cached === suggestions) {
    return cached;
  }
  snapshotCache.set(notebookId, suggestions);
  return suggestions;
}

export function getQuickstartSuggestionsSnapshot(
  notebookId?: string,
): QuickstartSuggestionsOut | null {
  return getSnapshot(notebookId);
}

export function setQuickstartSuggestions(
  notebookId: string,
  suggestions: QuickstartSuggestionsOut,
) {
  storeState.suggestionsByNotebookId.set(notebookId, suggestions);
  snapshotCache.delete(notebookId);
  emitChange();
}

export function clearQuickstartSuggestions(notebookId: string) {
  storeState.suggestionsByNotebookId.delete(notebookId);
  snapshotCache.delete(notebookId);
  emitChange();
}

export function removeQuickstartSuggestion(notebookId: string, title: string) {
  const current = storeState.suggestionsByNotebookId.get(notebookId);
  if (!current) return;

  const target = title.trim().toLowerCase();
  if (!target) return;

  const nextSuggestions = current.suggestions.filter(
    (item) => item.trim().toLowerCase() !== target,
  );
  if (nextSuggestions.length === current.suggestions.length) return;

  storeState.suggestionsByNotebookId.set(notebookId, {
    ...current,
    suggestions: nextSuggestions,
  });
  snapshotCache.delete(notebookId);
  emitChange();
}

export function useQuickstartSuggestionsStore(
  notebookId?: string,
): QuickstartSuggestionsOut | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getSnapshot(notebookId),
    () => getSnapshot(notebookId),
  );
}
