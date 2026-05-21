import { cn } from "../../../shared/lib/cn";
import type { AudioScriptSegment } from "../types/audio.types";

type Props = {
  segments: AudioScriptSegment[];
};

export function PodcastTranscript({ segments }: Props) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta generacion no incluye transcripcion.
      </p>
    );
  }

  const speakers = Array.from(new Set(segments.map((s) => s.speaker)));
  const speakerIndex = new Map(speakers.map((s, i) => [s, i] as const));
  const colors = [
    "border-primary/40 bg-primary/5",
    "border-emerald-500/40 bg-emerald-500/5",
    "border-amber-500/40 bg-amber-500/5",
  ];

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Transcripcion</h3>
      <div className="space-y-3">
        {segments.map((segment, index) => {
          const colorClass = colors[(speakerIndex.get(segment.speaker) ?? 0) % colors.length];
          return (
            <div
              key={`${segment.speaker}-${index}`}
              className={cn(
                "rounded-xl border bg-surface p-3 shadow-sm",
                colorClass,
              )}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {segment.speaker}
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{segment.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
