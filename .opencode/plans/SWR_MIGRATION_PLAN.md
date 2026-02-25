# SWR Migration Plan

## Goal

1. Eliminate loading flash when entering study modes (quickstart, quiz, chat, mindmap, flashcards, reports, presentations) by prefetching all mode data during `NotebookEntryRoute`'s loading screen.
2. Migrate the entire data-fetching layer to SWR as the clean foundation for prefetch.

---

## Why SWR

- ~4KB bundle, zero dependencies
- Built-in deduplication, revalidation, cache
- `preload()` is the native solution for prefetch
- `refreshInterval` as a function solves conditional polling (quiz roadmap)
- `mutate` with `optimisticData` + `rollbackOnError` handles optimistic updates
- Simpler API than TanStack Query; smaller bundle than Zustand

---

## Current State (before migration)

### Hand-rolled stores to delete

| File | Lines | Pattern |
|------|-------|---------|
| `features/notebooks/hooks/useNotebookStore.ts` | 50 | `useSyncExternalStore` |
| `features/notebooks/hooks/useNotebookDocumentsStore.ts` | 95 | `useSyncExternalStore` |
| `features/quickstart/hooks/useQuickstartStore.ts` | 112 | `useSyncExternalStore` |
| `features/quickstart/hooks/useQuickstartSuggestionsStore.ts` | ~80 | `useSyncExternalStore` |
| `features/quiz/hooks/useRoadmapStore.ts` | 56 | `useSyncExternalStore` |
| `features/notebook-chat/hooks/useChatStore.ts` | 96 | `useSyncExternalStore` |

### Module-level Map caches (non-reactive, inside hooks)

| Hook | Cache variable |
|------|----------------|
| `useNotebooks.ts` | `notebooksCacheByUserId` |
| `useFlashcards.ts` | `flashcardsCache` |
| `useReportsHistory.ts` | `reportsHistoryCache` |
| `usePresentationsHistory.ts` | `presentationsHistoryCache` |
| `useNotebookReadySources.ts` | `readySourcesCache` |

### Things that stay manual (NOT migrated to SWR)

| What | Why |
|------|-----|
| `GenerationMonitorProvider` | Global polling engine for async AI jobs — not fetch-based |
| `useGenerationJob` | Orchestrator for job lifecycle (202/poll/done/failed) |
| `useDocumentStream` | EventSource SSE — not fetch-based |
| `useGenerateReportSuggestions` | Reimplements job lifecycle internally; risky to touch |
| `useQuizQuestions` | Complex 202/poll state machine with 180s timeout |
| Chat streaming layer | ReadableStream SSE — not fetch-based |

---

## SWR Key Factory

File: `frontend/src/shared/lib/swrKeys.ts`

```ts
export const swrKeys = {
  notebooks: (userId: string) => ["notebooks", userId] as const,
  notebook: (id: string) => ["notebook", id] as const,
  documents: (notebookId: string) => ["documents", notebookId] as const,
  quickstart: (notebookId: string) => ["quickstart", notebookId] as const,
  quickstartSuggestions: (notebookId: string) => ["quickstart-suggestions", notebookId] as const,
  quickstartTopicDetail: (notebookId: string, topicId: string) => ["quickstart-topic", notebookId, topicId] as const,
  roadmap: (notebookId: string) => ["roadmap", notebookId] as const,
  chatConversation: (notebookId: string) => ["chat-conversation", notebookId] as const,
  chatMessages: (notebookId: string) => ["chat-messages", notebookId] as const,
  mindmap: (notebookId: string) => ["mindmap", notebookId] as const,
  flashcards: (notebookId: string) => ["flashcards", notebookId] as const,
  reportsHistory: (notebookId: string) => ["reports-history", notebookId] as const,
  presentationsHistory: (notebookId: string) => ["presentations-history", notebookId] as const,
} as const;
```

## Global SWR Config

Add to `frontend/src/main.tsx` (wrap the app):

```tsx
import { SWRConfig } from "swr";
import { apiRequest, type ApiError } from "./shared/lib/apiClient";

<SWRConfig
  value={{
    fetcher: (path: string) => apiRequest(path),
    dedupingInterval: 5000,
    revalidateOnFocus: false,
    onErrorRetry: (error: ApiError, _key, _config, revalidate, { retryCount }) => {
      if (error.status === 404) return;  // don't retry on 404
      if (retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 3000);
    },
  }}
>
  <App />
</SWRConfig>
```

---

## Phase 1 — Bootstrap

**Files to touch:** `frontend/package.json`, `frontend/src/main.tsx`, new `frontend/src/shared/lib/swrKeys.ts`

1. `npm install swr` in `frontend/`
2. Create `src/shared/lib/swrKeys.ts` with the key factory above
3. Add `SWRConfig` in `main.tsx`

**Verification:** `npm run build` passes, app loads normally.

---

## Phase 2 — Notebooks feature

**Goal:** Replace `useNotebook`, `useNotebooks`, `useDocuments`, `useNotebookReadySources` with SWR.  
**Delete:** `useNotebookStore.ts`, `useNotebookDocumentsStore.ts`  
**Keep:** `useDocumentStream.ts` (EventSource SSE)

### useNotebooks.ts
- `useSWR(swrKeys.notebooks(userId), () => notebooksApi.list())`
- `mutate` for reload and after create/delete/rename
- Remove `notebooksCacheByUserId` and `notebooksRequestByUserId`
- Keep `window.addEventListener("notebook-collaboration-changed", ...)` → call `mutate(swrKeys.notebooks(userId))`

### useNotebook.ts
- `useSWR(notebookId ? swrKeys.notebook(notebookId) : null, () => notebooksApi.get(notebookId!))`
- Remove dependency on `useNotebookStore` / `setNotebook`

### useDocuments.ts
- `useSWR(notebookId && enabled ? swrKeys.documents(notebookId) : null, () => documentsApi.list(notebookId!))`
- Remove `setNotebookDocuments` side-effect
- `reload` → `mutate(swrKeys.documents(notebookId))`

### useNotebookReadySources.ts
- Replace dual-store approach (`useNotebookDocumentsStore` + `useDocuments`) with single `useSWR` call
- Remove `readySourcesCache` module-level Map
- Derive `hasReadySources`, `hasAnyDocuments`, `hasProcessingDocuments` from SWR data
- `isResolving` → `isLoading` from SWR

**Delete after:**
- `useNotebookStore.ts`
- `useNotebookDocumentsStore.ts`

**Estimated net reduction:** ~145 lines

---

## Phase 3 — Quickstart + Quiz

### useQuickstart.ts
- `useSWR(notebookId ? swrKeys.quickstart(notebookId) : null, fetcher, { onErrorRetry: skip404 })`
- Remove `useQuickstartStore` dependency
- `reload` → `mutate(swrKeys.quickstart(notebookId))`
- `isNotFound` → `error?.status === 404`

### useQuickstartTopicDetail.ts (currently uses useRef cache)
- `useSWR(notebookId && topicId ? swrKeys.quickstartTopicDetail(notebookId, topicId) : null, fetcher)`
- Remove `useRef` cache entirely — SWR handles dedup

### Quickstart mutations (add topic, remove topic, reorder)
- Use `mutate(key, optimisticData, { rollbackOnError: true })` for reorder
- Use `mutate(key)` (revalidate) for add/remove

**Delete after:**
- `useQuickstartStore.ts`
- `useQuickstartSuggestionsStore.ts`

### useQuizRoadmap.ts
- `useSWR(notebookId ? swrKeys.roadmap(notebookId) : null, fetcher, { refreshInterval: (data) => needsPoll(data) ? 3000 : 0, onErrorRetry: skip404 })`
- Where `needsPoll(data)` = `data?.units.some(u => u.levels.some(l => l.questions_status === "generating"))`
- Remove manual `setInterval` polling
- Remove `useRoadmapStore` dependency

**Delete after:**
- `useRoadmapStore.ts`

**Estimated net reduction:** ~220 lines

---

## Phase 4 — Chat

### useNotebookChat.ts — REST layer only
- `useSWR(notebookId ? swrKeys.chatConversation(notebookId) : null, () => chatApi.getConversation(notebookId!))`
- `useSWR(notebookId ? swrKeys.chatMessages(notebookId) : null, () => chatApi.getMessages(notebookId!))`
- Remove `hydratedNotebookIds` Set
- Remove `useEffect` for loading conversation
- Keep `sendMessage` / `clearConversation` / streaming logic unchanged
- After `clearConversation`: `mutate(swrKeys.chatMessages(notebookId), [])`
- After `onDone` in streaming: `mutate(swrKeys.chatMessages(notebookId), [...messages, newMessage])`

**Delete after:**
- `useChatStore.ts`

**Estimated net reduction:** ~100 lines

---

## Phase 5 — Mindmap, Flashcards, Reports, Presentations

### useMindmap.ts
- `useSWR(notebookId ? swrKeys.mindmap(notebookId) : null, fetcher)`
- Remove manual `requestIdRef`, `useEffect` loading logic

### useFlashcards.ts
- `useSWR(notebookId ? swrKeys.flashcards(notebookId) : null, fetcher)`
- Remove `flashcardsCache` module-level Map
- Remove `useEffect` cache-check logic

### useReportsHistory.ts
- `useSWR(notebookId ? swrKeys.reportsHistory(notebookId) : null, fetcher)`
- `removeReport(id)` → `mutate(key, (prev) => prev?.filter(r => r.id !== id), false)`
- Remove `reportsHistoryCache` module-level Map
- Remove exported `hasCachedReports` (callers should use SWR data directly)

### usePresentationsHistory.ts
- Same pattern as `useReportsHistory`
- Remove `presentationsHistoryCache`
- Remove exported `hasCachedPresentations`

**4 NotebookSources hooks** (mindmap/flashcards/reports/presentations) — all ~145-152 lines, near-identical:
- Each currently has module-level Map caches
- Each can be simplified to `useSWR` + remove the cache Map

**Estimated net reduction:** ~200 lines

---

## Phase 6 — Prefetch (the original goal)

### useNotebookPrefetch.ts

New file: `frontend/src/features/notebooks/hooks/useNotebookPrefetch.ts`

```ts
import { preload } from "swr";
import { swrKeys } from "../../../shared/lib/swrKeys";
import { quickstartApi } from "../../quickstart/api/quickstartApi";
import { quizApi } from "../../quiz/api/quizApi";
import { chatApi } from "../../notebook-chat/api/chatApi";
import { mindmapApi } from "../../mindmap/api/mindmapApi";
import { flashcardsApi } from "../../flashcards/api/flashcardsApi";
import { reportsApi } from "../../reports/api/reportsApi";
import { presentationsApi } from "../../presentations/api/presentationsApi";

export function prefetchNotebookModes(notebookId: string): void {
  void preload(swrKeys.quickstart(notebookId), () => quickstartApi.getQuickstart(notebookId));
  void preload(swrKeys.roadmap(notebookId), () => quizApi.getRoadmap(notebookId));
  void preload(swrKeys.chatConversation(notebookId), () => chatApi.getConversation(notebookId));
  void preload(swrKeys.chatMessages(notebookId), () => chatApi.getMessages(notebookId));
  void preload(swrKeys.mindmap(notebookId), () => mindmapApi.getMindmap(notebookId));
  void preload(swrKeys.flashcards(notebookId), () => flashcardsApi.getFlashcards(notebookId));
  void preload(swrKeys.reportsHistory(notebookId), () => reportsApi.listReports(notebookId));
  void preload(swrKeys.presentationsHistory(notebookId), () => presentationsApi.listPresentations(notebookId));
}
```

### Wire into NotebookEntryRoute (App.tsx)

```tsx
function NotebookEntryRoute() {
  const { notebookId } = useParams();
  const { hasReadySources, isResolving } = useNotebookReadySources(notebookId);

  useEffect(() => {
    if (notebookId && hasReadySources) {
      prefetchNotebookModes(notebookId);
    }
  }, [notebookId, hasReadySources]);

  // ... rest unchanged
}
```

Prefetch fires once `hasReadySources` is confirmed, populating SWR cache before the redirect to `/quickstart`. When the mode components mount, SWR finds data already in cache — zero loading flash.

---

## File Inventory Summary

### New files
| Path | Purpose |
|------|---------|
| `frontend/src/shared/lib/swrKeys.ts` | Centralized SWR key factory |
| `frontend/src/features/notebooks/hooks/useNotebookPrefetch.ts` | `prefetchNotebookModes()` helper |

### Modified files
| Path | Change |
|------|--------|
| `frontend/src/main.tsx` | Add `SWRConfig` wrapper |
| `frontend/src/App.tsx` | Wire `prefetchNotebookModes` into `NotebookEntryRoute` |
| `frontend/src/features/notebooks/hooks/useNotebook.ts` | Migrate to `useSWR` |
| `frontend/src/features/notebooks/hooks/useNotebooks.ts` | Migrate to `useSWR` |
| `frontend/src/features/notebooks/hooks/useDocuments.ts` | Migrate to `useSWR` |
| `frontend/src/features/notebooks/hooks/useNotebookReadySources.ts` | Simplify with `useSWR` |
| `frontend/src/features/quickstart/hooks/useQuickstart.ts` | Migrate to `useSWR` |
| `frontend/src/features/quickstart/hooks/useQuickstartTopicDetail.ts` | Migrate to `useSWR` |
| `frontend/src/features/quiz/hooks/useQuizRoadmap.ts` | Migrate to `useSWR` with `refreshInterval` |
| `frontend/src/features/notebook-chat/hooks/useNotebookChat.ts` | Migrate REST layer to `useSWR` |
| `frontend/src/features/mindmap/hooks/useMindmap.ts` | Migrate to `useSWR` |
| `frontend/src/features/flashcards/hooks/useFlashcards.ts` | Migrate to `useSWR` |
| `frontend/src/features/reports/hooks/useReportsHistory.ts` | Migrate to `useSWR` |
| `frontend/src/features/presentations/hooks/usePresentationsHistory.ts` | Migrate to `useSWR` |
| Feature NotebookSources hooks (×4) | Remove module-level Map caches |

### Deleted files
| Path | Replaced by |
|------|------------|
| `features/notebooks/hooks/useNotebookStore.ts` | SWR cache |
| `features/notebooks/hooks/useNotebookDocumentsStore.ts` | SWR cache |
| `features/quickstart/hooks/useQuickstartStore.ts` | SWR cache |
| `features/quickstart/hooks/useQuickstartSuggestionsStore.ts` | SWR cache |
| `features/quiz/hooks/useRoadmapStore.ts` | SWR cache |
| `features/notebook-chat/hooks/useChatStore.ts` | SWR cache |

---

## Risk Table

| Risk | Mitigation |
|------|------------|
| 404 causes retry storms | `onErrorRetry` skips 404 globally in `SWRConfig` |
| Optimistic reorder rollback leaves stale UI | `rollbackOnError: true` + typed `optimisticData` |
| Chat streaming writes race with SWR revalidation | Use `mutate(key, data, { revalidate: false })` after `onDone` |
| `notebook-collaboration-changed` event lost | Keep listener, call `mutate(swrKeys.notebooks(userId))` |
| `hasCachedReports` / `hasCachedPresentations` callers break | Find all callers before Phase 5, migrate to SWR `data` |

---

## Estimated Code Reduction

| Phase | Lines removed | Lines added | Net |
|-------|--------------|-------------|-----|
| Phase 2 | ~145 | ~60 | −85 |
| Phase 3 | ~220 | ~80 | −140 |
| Phase 4 | ~100 | ~40 | −60 |
| Phase 5 | ~200 | ~80 | −120 |
| Phase 6 | 0 | ~40 | +40 |
| **Total** | **~665** | **~300** | **~−365** |

---

## Execution Checklist

- [ ] Phase 1: install SWR, add `SWRConfig`, create `swrKeys.ts`
- [ ] Phase 2: notebooks feature — delete 2 store files
- [ ] Phase 3: quickstart + quiz — delete 3 store files
- [ ] Phase 4: chat — delete 1 store file
- [ ] Phase 5: mindmap, flashcards, reports, presentations
- [ ] Phase 6: `useNotebookPrefetch`, wire into `NotebookEntryRoute`
- [ ] Run `npm run lint` (frontend)
- [ ] Run `npm run build` (confirm zero errors)
