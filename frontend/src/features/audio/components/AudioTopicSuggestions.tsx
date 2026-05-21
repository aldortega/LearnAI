import { RefreshCw, Sparkles } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { AudioSuggestion } from "../types/audio.types";

type Props = {
  suggestions: AudioSuggestion[];
  disabled: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  onSelectSuggestion: (suggestion: AudioSuggestion) => void;
  onRefresh: () => void;
};

function SuggestionSkeletonCard() {
  return (
    <div
      aria-hidden
      className="relative h-[120px] flex-1 basis-0 overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-background/60 to-transparent animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite]" />
      </div>
      <div className="relative space-y-3">
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse [animation-duration:1.2s]" />
        <div className="h-3 w-full rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:120ms]" />
        <div className="h-3 w-11/12 rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:220ms]" />
      </div>
    </div>
  );
}

export function AudioTopicSuggestions({
  suggestions,
  disabled,
  isLoading,
  isRefreshing,
  isStale,
  onSelectSuggestion,
  onRefresh,
}: Props) {
  const visible = suggestions.slice(0, 4);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <span>Temas sugeridos por IA</span>
          <Sparkles className="h-3.5 w-3.5" />
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={disabled || isRefreshing}
          aria-label="Actualizar sugerencias de IA"
          title="Actualizar sugerencias de IA"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition",
            "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            (disabled || isRefreshing) && "cursor-not-allowed opacity-60",
          )}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          <span>Actualizar</span>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading
          ? [1, 2, 3, 4].map((slot) => <SuggestionSkeletonCard key={slot} />)
          : visible.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => onSelectSuggestion(suggestion)}
                disabled={disabled}
                className={cn(
                  "flex h-full flex-col items-start gap-1.5 rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition",
                  "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <p className="text-sm font-semibold text-foreground">
                  {suggestion.title}
                </p>
                <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {suggestion.description}
                </p>
              </button>
            ))}
      </div>
      {!isLoading && visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Todavia no hay sugerencias de IA para esta notebook.
        </p>
      ) : null}
      {isStale ? (
        <p className="text-xs text-muted-foreground">
          Mostrando sugerencias previas mientras se actualizan.
        </p>
      ) : null}
    </section>
  );
}
