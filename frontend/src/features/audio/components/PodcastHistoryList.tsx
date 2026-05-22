import { Headphones, MoreVertical, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import type { PodcastOut } from "../types/audio.types";
import { PodcastPlayer } from "./PodcastPlayer";

type Props = {
  podcasts: PodcastOut[];
  isLoading: boolean;
  hasResolved: boolean;
  isGenerating: boolean;
  deletingPodcastId: string | null;
  onDeletePodcast: (podcast: PodcastOut) => void;
};

type CardProps = {
  podcast: PodcastOut;
  isDeleting: boolean;
  isAnyDeleting: boolean;
  onDelete: (podcast: PodcastOut) => void;
};


function PodcastCard({
  podcast,
  isDeleting,
  isAnyDeleting,
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

  const menuSlot = (
    <div className="relative shrink-0 ml-auto" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        disabled={isAnyDeleting}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
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
            <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <PodcastPlayer
      audioUrl={podcast.audio_url}
      title={podcast.title}
      description={podcast.description ?? undefined}
      initialDuration={podcast.duration_seconds}
      menuSlot={menuSlot}
    />
  );
}

export function PodcastHistoryList({
  podcasts,
  isLoading,
  hasResolved,
  isGenerating,
  deletingPodcastId,
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
        <div className="space-y-4">
          {isGenerating ? (
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Headphones className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="relative h-3 w-2/3 overflow-hidden rounded-full bg-muted/70">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                  <div className="relative h-2.5 w-5/6 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {podcasts.map((podcast) => (
            <PodcastCard
              key={podcast.id}
              podcast={podcast}
              isDeleting={deletingPodcastId === podcast.id}
              isAnyDeleting={Boolean(deletingPodcastId)}
              onDelete={onDeletePodcast}
            />
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
