import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { VoicePhase } from "../types";

type Props = {
  phase: VoicePhase;
  muted: boolean;
  onStart: () => void;
  onToggleMute: () => void;
  onEnd: () => void;
};

export function VoiceControls({
  phase,
  muted,
  onStart,
  onToggleMute,
  onEnd,
}: Props) {
  const isActive =
    phase === "listening" || phase === "speaking" || phase === "thinking";
  const canStart = phase === "idle" || phase === "ended" || phase === "error";

  return (
    <div className="flex items-center justify-center gap-6">
      {isActive ? (
        <button
          type="button"
          onClick={onToggleMute}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border border-border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            muted
              ? "bg-error text-error-foreground"
              : "bg-surface text-foreground hover:bg-muted",
          )}
          aria-label={muted ? "Activar microfono" : "Silenciar microfono"}
        >
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      ) : null}

      {canStart ? (
        <button
          type="button"
          onClick={onStart}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Iniciar llamada"
        >
          <Phone className="h-6 w-6" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnd}
          disabled={phase === "connecting"}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-error text-error-foreground shadow-lg transition hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Terminar llamada"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
