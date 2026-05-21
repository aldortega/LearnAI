import { cn } from "../../../shared/lib/cn";
import type { AudioDuration } from "../types/audio.types";

type Props = {
  value: AudioDuration;
  disabled: boolean;
  onChange: (value: AudioDuration) => void;
};

const OPTIONS: { value: AudioDuration; label: string; hint: string }[] = [
  { value: "short", label: "Corto", hint: "3-5 min" },
  { value: "default", label: "Por defecto", hint: "7-10 min" },
  { value: "long", label: "Largo", hint: "15-20 min" },
];

export function AudioDurationSelector({ value, disabled, onChange }: Props) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Duracion</h3>
      <div
        role="radiogroup"
        aria-label="Duracion del podcast"
        className="inline-flex rounded-xl border border-border bg-surface p-1"
      >
        {OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-4 py-2 text-xs font-medium transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "text-[10px] font-normal",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
