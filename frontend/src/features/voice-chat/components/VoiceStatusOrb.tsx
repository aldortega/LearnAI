import { cn } from "../../../shared/lib/cn";
import type { VoicePhase } from "../types";

type Props = {
  phase: VoicePhase;
};

const PHASE_LABEL: Record<VoicePhase, string> = {
  idle: "Toca para iniciar",
  connecting: "Conectando...",
  listening: "Escuchando",
  speaking: "Hablando",
  thinking: "Pensando...",
  error: "Error",
  ended: "Llamada finalizada",
};

const PHASE_CLASS: Record<VoicePhase, string> = {
  idle: "bg-muted",
  connecting: "bg-primary/40 animate-pulse",
  listening: "bg-primary/70 animate-pulse",
  speaking: "bg-emerald-500/80 animate-pulse",
  thinking: "bg-amber-500/70 animate-pulse",
  error: "bg-error",
  ended: "bg-muted",
};

export function VoiceStatusOrb({ phase }: Props) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-48 w-48 items-center justify-center">
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-40 blur-2xl transition-colors",
            PHASE_CLASS[phase],
          )}
          aria-hidden
        />
        <span
          className={cn(
            "h-32 w-32 rounded-full shadow-xl transition-colors",
            PHASE_CLASS[phase],
          )}
          aria-hidden
        />
      </div>
      <p
        className="text-base font-medium text-foreground"
        aria-live="polite"
      >
        {PHASE_LABEL[phase]}
      </p>
    </div>
  );
}
