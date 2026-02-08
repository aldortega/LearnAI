import { useEffect } from "react";

import type { QuickstartOut } from "../types/quickstart.types";
import { useAddQuickstartTopic } from "../hooks/useAddQuickstartTopic";
import { useQuickstartSuggestions } from "../hooks/useQuickstartSuggestions";
import { appendQuickstartTopic } from "../hooks/useQuickstartStore";
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

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 pt-8">
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              De que trata esta notebook
            </h2>
          </div>

          {isStale ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              role="alert"
            >
              Se detectaron cambios en tus fuentes. Regenera para mantener el inicio
              rapido actualizado.
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-3">
            {displaySummaryParagraphs.map((paragraph, index) => (
              <p
                key={`summary-${index}`}
                className="text-sm leading-6 text-zinc-700 dark:text-zinc-300"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Temas principales
          </p>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <QuickstartTopicsList
          topics={quickstart.topics}
          notebookId={notebookId}
          isStale={isStale}
        />

        <QuickstartTopicSuggestions
          suggestions={suggestions?.suggestions ?? []}
          topicCount={quickstart.topics.length}
          topicLimit={suggestions?.topic_limit ?? 12}
          canAddTopics={suggestions?.can_add_topics ?? false}
          isLoading={isLoading}
          isAdding={isAdding}
          error={addTopicError ?? suggestionsError}
          isStale={isStale}
          onRefresh={reload}
          onAddTopic={handleAddTopic}
        />

        <div className="h-[calc(1rem+env(safe-area-inset-bottom))] shrink-0" />
      </div>
    </div>
  );
}
