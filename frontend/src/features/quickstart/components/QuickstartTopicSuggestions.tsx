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
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Temas sugeridos
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {isStale ? (
        <p className="text-xs text-amber-700 dark:text-amber-300" role="alert">
          Regenera el inicio rapido para agregar nuevos temas.
        </p>
      ) : null}

      {!isStale && remaining <= 0 ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-300" role="alert">
          Alcanzaste el limite de temas para esta notebook.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              void onAddTopic(suggestion, "suggestion");
            }}
            disabled={isDisabled}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {suggestion}
          </button>
        ))}
        {isLoading ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Cargando sugerencias...
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={customTopic}
          onChange={(event) => setCustomTopic(event.target.value)}
          maxLength={120}
          placeholder="Escribe un tema para agregar"
          disabled={isDisabled}
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
