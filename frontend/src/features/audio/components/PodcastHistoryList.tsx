import { Headphones, MoreVertical, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { cn } from "../../../shared/lib/cn";
import type { PodcastOut } from "../types/audio.types";
import { formatTime } from "../utils/formatTime";

type Props = {
  podcasts: PodcastOut[];
  isLoading: boolean;
  hasResolved: boolean;
  isGenerating: boolean;
  selectedPodcastId: string | null;
  deletingPodcastId: string | null;
  onSelectPodcast: (podcastId: string) => void;
  onDeletePodcast: (podcast: PodcastOut) => void;
};

type CardProps = {
  podcast: PodcastOut;
  isSelected: boolean;
  isDeleting: boolean;
  isAnyDeleting: boolean;
  onSelect: (podcastId: string) => void;
  onDelete: (podcast: PodcastOut) => void;
};

const FORMAT_LABELS: Record<string, string> = {
  deep_dive: "Analisis en profundidad",
  brief: "Breve resumen",
  critique: "Critica",
  debate: "Debate",
};

function PodcastPreviewCard({
  podcast,
  isSelected,
  isDeleting,
  isAnyDeleting,
  onSelect,
  onDelete,
}: CardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onDelete(podcast);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(podcast.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(podcast.id);
      }}
      className={cn(
        "group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60",
        isSelected && "bg-muted/50",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Headphones className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground group-hover:text-primary">
          {podcast.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {podcast.description || FORMAT_LABELS[podcast.format_type] || "Podcast generado"}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {FORMAT_LABELS[podcast.format_type] ?? podcast.format_type} ·{" "}
          {formatTime(podcast.duration_seconds)}
        </p>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          disabled={isAnyDeleting}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Opciones de ${podcast.title}`}
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isAnyDeleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className={cn("h-4 w-4", isDeleting && "animate-pulse")} />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PodcastHistoryList({
  podcasts,
  isLoading,
  hasResolved,
  isGenerating,
  selectedPodcastId,
  deletingPodcastId,
  onSelectPodcast,
  onDeletePodcast,
}: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">
        Podcasts generados{" "}
        <span className="inline-block min-w-[2ch] text-right font-normal tabular-nums text-muted-foreground">
          ({!hasResolved || isLoading ? " " : podcasts.length})
        </span>
      </h3>
      {podcasts.length > 0 || isGenerating ? (
        <div className="rounded-xl border border-border bg-surface">
          {isGenerating ? (
            <div>
              <div className="group flex items-start gap-4 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Headphones className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="relative h-3 w-2/3 overflow-hidden rounded-full bg-muted/70">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                  <div className="relative h-2.5 w-5/6 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                </div>
              </div>
              {podcasts.length > 0 ? (
                <div className="mx-4 border-t border-border" />
              ) : null}
            </div>
          ) : null}
          {podcasts.map((podcast, index) => (
            <div key={podcast.id}>
              <PodcastPreviewCard
                podcast={podcast}
                isSelected={selectedPodcastId === podcast.id}
                isDeleting={deletingPodcastId === podcast.id}
                isAnyDeleting={Boolean(deletingPodcastId)}
                onSelect={onSelectPodcast}
                onDelete={onDeletePodcast}
              />
              {index !== podcasts.length - 1 ? (
                <div className="mx-4 border-t border-border" />
              ) : null}
            </div>
          ))}
        </div>
      ) : !isLoading && hasResolved ? (
        <p className="text-sm text-muted-foreground">
          Aun no has generado ningun podcast.
        </p>
      ) : null}
    </section>
  );
}
