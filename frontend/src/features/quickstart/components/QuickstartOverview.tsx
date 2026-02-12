import { useEffect, useState } from "react";

import type { QuickstartOut, QuickstartTopic } from "../types/quickstart.types";
import { useAddQuickstartTopic } from "../hooks/useAddQuickstartTopic";
import { useDeleteQuickstartTopic } from "../hooks/useDeleteQuickstartTopic";
import { useReorderQuickstartTopics } from "../hooks/useReorderQuickstartTopics";
import { useQuickstartSuggestions } from "../hooks/useQuickstartSuggestions";
import { appendQuickstartTopic, removeQuickstartTopic } from "../hooks/useQuickstartStore";
import { DeleteQuickstartTopicModal } from "./DeleteQuickstartTopicModal";
import { QuickstartTopicSuggestions } from "./QuickstartTopicSuggestions";
import { QuickstartTopicsList } from "./QuickstartTopicsList";

type Props = {
  quickstart: QuickstartOut;
  notebookId?: string;
  error: string | null;
};

export function QuickstartOverview({
  quickstart,
  notebookId,
  error,
}: Props) {
  const [deleteTarget, setDeleteTarget] = useState<QuickstartTopic | null>(null);
  const isStale = quickstart.status === "stale";
  const {
    suggestions,
    isLoading,
    error: suggestionsError,
    loadIfMissing,
    reload,
    removeSuggestion,
  } =
    useQuickstartSuggestions(notebookId, Boolean(notebookId));
  const {
    addTopic,
    isAdding,
    error: addTopicError,
    clearError: clearAddTopicError,
  } = useAddQuickstartTopic(notebookId);
  const {
    deleteTopic,
    deletingTopicId,
    error: deleteTopicError,
    clearError: clearDeleteTopicError,
  } = useDeleteQuickstartTopic(notebookId);
  const {
    reorderTopics,
    isReordering,
    error: reorderTopicError,
    clearError: clearReorderTopicError,
  } = useReorderQuickstartTopics(notebookId, quickstart);

  const summaryParagraphs = quickstart.notebook_summary
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const displaySummaryParagraphs =
    summaryParagraphs.length > 0
      ? summaryParagraphs
      : quickstart.topics
          .map((topic) => topic.summary.trim())
          .filter(Boolean)
          .slice(0, 2);

  useEffect(() => {
    void loadIfMissing();
  }, [loadIfMissing]);

  const handleAddTopic = async (
    title: string,
    source: "suggestion" | "custom",
  ) => {
    if (!notebookId) return;
    clearAddTopicError();
    const newTopic = await addTopic(title);
    if (!newTopic) return;
    appendQuickstartTopic(notebookId, newTopic);
    if (source === "suggestion") {
      removeSuggestion(title);
    }
  };

  const handleDeleteRequest = (topic: QuickstartTopic) => {
    clearDeleteTopicError();
    clearReorderTopicError();
    setDeleteTarget(topic);
  };

  const handleDeleteCancel = () => {
    clearDeleteTopicError();
    setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!notebookId || !deleteTarget) return;

    clearDeleteTopicError();
    const deleted = await deleteTopic(deleteTarget.id);
    if (!deleted) return;

    removeQuickstartTopic(notebookId, deleteTarget.id);
    setDeleteTarget(null);
    await reload();
  };

  const handleReorderTopics = async (topicIds: string[]) => {
    clearDeleteTopicError();
    clearReorderTopicError();
    await reorderTopics(topicIds);
  };

  return (
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 pt-8">
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              De que trata esta notebook
            </h2>
          </div>

          {isStale ? (
            <div
              className="rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"
              role="alert"
            >
              Se detectaron cambios en tus fuentes. Regenera para mantener el inicio
              rapido actualizado.
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {displaySummaryParagraphs.map((paragraph, index) => (
              <p
                key={`summary-${index}`}
                className="text-sm leading-6 text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-muted-hover" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Temas principales
          </p>
          <div className="h-px flex-1 bg-muted-hover" />
        </div>

        <QuickstartTopicsList
          topics={quickstart.topics}
          notebookId={notebookId}
          isStale={isStale}
          canDelete={Boolean(notebookId)}
          canReorder={Boolean(notebookId)}
          isReordering={isReordering}
          deletingTopicId={deletingTopicId}
          onDeleteTopic={handleDeleteRequest}
          onReorderTopics={handleReorderTopics}
        />

        <QuickstartTopicSuggestions
          suggestions={suggestions?.suggestions ?? []}
          topicCount={quickstart.topics.length}
          topicLimit={suggestions?.topic_limit ?? 12}
          canAddTopics={suggestions?.can_add_topics ?? false}
          isLoading={isLoading}
          isAdding={isAdding || isReordering}
          error={addTopicError ?? deleteTopicError ?? reorderTopicError ?? suggestionsError}
          isStale={isStale}
          onRefresh={reload}
          onAddTopic={handleAddTopic}
        />

        <DeleteQuickstartTopicModal
          isOpen={Boolean(deleteTarget)}
          topicTitle={deleteTarget?.title}
          error={deleteTopicError}
          isDeleting={Boolean(deleteTarget) && deletingTopicId === deleteTarget?.id}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        <div className="h-[calc(1rem+env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </div>
  );
}
