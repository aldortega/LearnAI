import { RefreshCw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Button } from "../../../shared/ui/Button";

type Props = {
  suggestions: string[];
  topicCount: number;
  topicLimit: number;
  canAddTopics: boolean;
  isLoading: boolean;
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
  isAdding,
  error,
  isStale,
  onRefresh,
  onAddTopic,
}: Props) {
  const [customTopic, setCustomTopic] = useState("");
  const trimmedTopic = customTopic.trim();
  const remaining = useMemo(
    () => Math.max(topicLimit - topicCount, 0),
    [topicLimit, topicCount],
  );
  const isDisabled = !canAddTopics || isStale || remaining <= 0 || isAdding;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedTopic || isDisabled) return;
    await onAddTopic(trimmedTopic, "custom");
    setCustomTopic("");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">
          Temas sugeridos
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/70">
            {topicCount}/{topicLimit} temas
          </span>
          <button
            type="button"
            aria-label="Actualizar sugerencias"
            title="Actualizar sugerencias"
            onClick={() => {
              void onRefresh();
            }}
            disabled={isDisabled || isLoading}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

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
          suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                void onAddTopic(suggestion, "suggestion");
              }}
              disabled={isDisabled}
              className="rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-foreground/80 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              {suggestion}
            </button>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={customTopic}
          onChange={(event) => setCustomTopic(event.target.value)}
          maxLength={120}
          placeholder="Escribe un tema para agregar"
          disabled={isDisabled}
          className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="submit"
          loading={isAdding}
          disabled={!trimmedTopic || isDisabled}
          className="sm:self-start"
        >
          Agregar tema
        </Button>
      </form>
    </section>
  );
}

