import { LoaderCircle } from "lucide-react";

import { PodcastPlayer } from "./PodcastPlayer";
import { PodcastTranscript } from "./PodcastTranscript";
import type { PodcastDetailOut } from "../types/audio.types";

type Props = {
  podcast: PodcastDetailOut | null;
  isLoading: boolean;
  error: string | null;
};

const FORMAT_LABELS: Record<string, string> = {
  deep_dive: "Analisis en profundidad",
  brief: "Breve resumen",
  critique: "Critica",
  debate: "Debate",
};

export function PodcastDetail({ podcast, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error" role="alert">
        {error}
      </p>
    );
  }

  if (!podcast) {
    return (
      <p className="text-sm text-muted-foreground">
        Selecciona un podcast para verlo aqui.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {FORMAT_LABELS[podcast.format_type] ?? podcast.format_type}
        </p>
        <h1 className="text-2xl font-bold text-foreground">{podcast.title}</h1>
        {podcast.description ? (
          <p className="text-sm text-muted-foreground">{podcast.description}</p>
        ) : null}
        {podcast.topic ? (
          <p className="text-xs text-muted-foreground">Tema: {podcast.topic}</p>
        ) : null}
      </header>
      <PodcastPlayer
        audioUrl={podcast.audio_url}
        title={podcast.title}
        initialDuration={podcast.duration_seconds}
      />
      <PodcastTranscript segments={podcast.script} />
      {podcast.sources.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Fuentes usadas</h3>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {podcast.sources.map((source) => (
              <li
                key={`${source.document_id}-${source.chunk_id}`}
                className="truncate"
              >
                {source.file_name ?? source.document_id}
                {typeof source.page === "number" ? ` · pag. ${source.page}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
