import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { Streamdown } from "streamdown";

import { swrKeys } from "../../../shared/lib/swrKeys";
import { normalizeMarkdown } from "../utils/markdown";
import type { QuickstartOut, QuickstartTopic } from "../types/quickstart.types";
import { useAddQuickstartTopic } from "../hooks/useAddQuickstartTopic";
import { useDeleteQuickstartTopic } from "../hooks/useDeleteQuickstartTopic";
import { useReorderQuickstartTopics } from "../hooks/useReorderQuickstartTopics";
import { useQuickstartSuggestions } from "../hooks/useQuickstartSuggestions";
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
  const { mutate } = useSWRConfig();
  const [deleteTarget, setDeleteTarget] = useState<QuickstartTopic | null>(null);
  const isStale = quickstart.status === "stale";
  const {
    suggestions,
    isLoading,
    isRefreshing,
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
  const displaySummary =
    summaryParagraphs.length > 0
      ? quickstart.notebook_summary.trim()
      : quickstart.topics
        .map((topic) => topic.summary.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join("\n\n");

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

    await mutate(
      swrKeys.quickstart(notebookId),
      (currentQuickstart?: QuickstartOut | null) => {
        const baseQuickstart = currentQuickstart ?? quickstart;
        const exists = baseQuickstart.topics.some((topic) => topic.id === newTopic.id);
        if (exists) {
          return baseQuickstart;
        }

        return {
          ...baseQuickstart,
          topics: [...baseQuickstart.topics, newTopic],
        };
      },
      { revalidate: false },
    );

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

    await mutate(
      swrKeys.quickstart(notebookId),
      (currentQuickstart?: QuickstartOut | null) => {
        const baseQuickstart = currentQuickstart ?? quickstart;
        return {
          ...baseQuickstart,
          topics: baseQuickstart.topics.filter((topic) => topic.id !== deleteTarget.id),
        };
      },
      { revalidate: false },
    );

    setDeleteTarget(null);
    await reload();
  };

  const handleReorderTopics = async (topicIds: string[]) => {
    clearDeleteTopicError();
    clearReorderTopicError();
    await reorderTopics(topicIds);
  };

  const topicCount = quickstart.topics.length;

  return (
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 pt-8 sm:px-8 xl:max-w-4xl 2xl:max-w-5xl">
        {isStale ? (
          <div
            className="rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"
            role="alert"
          >
            Se detectaron cambios en tus fuentes. Regenera para mantener el inicio
            rápido actualizado.
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

        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-[1.15]">
            Resumen
          </h2>
          <div className="max-w-[68ch] text-[15px] leading-7 text-foreground/90 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1">
            <Streamdown>{normalizeMarkdown(displaySummary)}</Streamdown>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px] sm:leading-[1.15]">
                Temas principales
              </h2>
              <p className="text-xs text-foreground/65">
                Generados automáticamente desde tus fuentes. Abre uno para profundizar.
              </p>
            </div>
            {topicCount > 0 ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground/70">
                {String(topicCount).padStart(2, "0")}
              </span>
            ) : null}
          </div>

          <QuickstartTopicsList
            topics={quickstart.topics}
            notebookId={notebookId}
            canDelete={Boolean(notebookId)}
            canReorder={Boolean(notebookId)}
            isReordering={isReordering}
            deletingTopicId={deletingTopicId}
            onDeleteTopic={handleDeleteRequest}
            onReorderTopics={handleReorderTopics}
          />
        </section>

        <QuickstartTopicSuggestions
          suggestions={suggestions?.suggestions ?? []}
          topicCount={quickstart.topics.length}
          topicLimit={suggestions?.topic_limit ?? 12}
          canAddTopics={suggestions?.can_add_topics ?? false}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
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
