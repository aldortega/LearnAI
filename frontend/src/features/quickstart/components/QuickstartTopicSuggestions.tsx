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
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Temas sugeridos
          </h3>
          <p className="text-xs text-foreground/65">
            Ideas extra a partir de tus fuentes. Toca una para añadirla a tus temas.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            title="Agregar tema personalizado"
            disabled={isDisabled}
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 text-xs font-medium text-foreground/80 transition hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar tema</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isStale ? (
          <p className="text-xs text-warning" role="alert">
            Regenera el inicio rápido para agregar nuevos temas.
          </p>
        ) : null}

        {!isStale && remaining > 0 ? (
          <p className="text-[11px] font-medium tabular-nums text-muted-foreground/70">
            {remaining} de {topicLimit} disponibles
          </p>
        ) : null}

        {!isStale && remaining <= 0 ? (
          <p className="text-xs text-foreground/75" role="alert">
            Alcanzaste el límite de temas para esta notebook.
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
                  className="cursor-pointer rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:border-primary/40 hover:bg-muted-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {suggestion}
                </button>
              ))}
            </>
          )}
        </div>

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
  );
}
