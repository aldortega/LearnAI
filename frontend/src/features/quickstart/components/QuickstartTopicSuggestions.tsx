import { Plus, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { AddQuickstartTopicModal } from "./AddQuickstartTopicModal";

type Props = {
  suggestions: string[];
  topicCount: number;
  topicLimit: number;
  canAddTopics: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isAdding: boolean;
  error: string | null;
  isStale: boolean;
  onRefresh: () => Promise<unknown> | void;
  onAddTopic: (title: string, source: "suggestion" | "custom") => Promise<void>;
};

export function QuickstartTopicSuggestions({
  suggestions,
  topicCount,
  topicLimit,
  canAddTopics,
  isLoading,
  isRefreshing,
  isAdding,
  error,
  isStale,
  onRefresh,
  onAddTopic,
}: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const remaining = useMemo(
    () => Math.max(topicLimit - topicCount, 0),
    [topicLimit, topicCount],
  );
  const isDisabled = !canAddTopics || isStale || remaining <= 0 || isAdding;
  const isRefreshDisabled = isDisabled || isLoading || isRefreshing;

  const handleConfirmCustomTopic = async (title: string) => {
    await onAddTopic(title, "custom");
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-md font-bold text-foreground">
          Temas sugeridos
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Actualizar sugerencias"
            title="Actualizar sugerencias"
            onClick={() => {
              void onRefresh();
            }}
            disabled={isRefreshDisabled}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full cursor-pointer bg-muted text-foreground/80 transition hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            aria-label="Agregar tema personalizado"
            title="Agregar tema"
            disabled={isDisabled}
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full cursor-pointer bg-muted text-foreground/80 transition hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        {isStale ? (
          <p className="text-xs text-warning" role="alert">
            Regenera el inicio rapido para agregar nuevos temas.
          </p>
        ) : null}

        {!isStale && remaining <= 0 ? (
          <p className="text-xs text-foreground/75" role="alert">
            Alcanzaste el limite de temas para esta notebook.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((slot) => (
                <span
                  key={`suggestion-skeleton-${slot}`}
                  aria-hidden
                  className="h-8 w-28 rounded-full border border-border bg-muted animate-pulse [animation-duration:1.2s]"
                />
              ))}
              <span className="sr-only" aria-live="polite">
                Cargando sugerencias...
              </span>
            </>
          ) : (
            <>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    void onAddTopic(suggestion, "suggestion");
                  }}
                  disabled={isDisabled}
                  className="cursor-pointer rounded-full  bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-muted-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </>
          )}
        </div>

        <AddQuickstartTopicModal
          isOpen={isAddModalOpen}
          isAdding={isAdding}
          isDisabled={isDisabled}
          error={error}
          onCancel={() => setIsAddModalOpen(false)}
          onConfirm={handleConfirmCustomTopic}
        />
      </section>
    </div>
  );
}
