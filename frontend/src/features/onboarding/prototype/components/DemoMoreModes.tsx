// PROTOTYPE — onboarding demo (throwaway). Resto de modos de estudio, con descripción al tocarlos.
import { FileText, Headphones, Layers, Mic, Presentation } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../../shared/lib/cn";
import { MORE_STUDY_MODES } from "../demoData";

const ICONS: Record<string, typeof Layers> = {
  flashcards: Layers,
  reports: FileText,
  presentations: Presentation,
  audio: Headphones,
  voice: Mic,
};

export function DemoMoreModes() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const active = MORE_STUDY_MODES.find((m) => m.key === activeKey);

  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Más modos de estudio para explorar</p>
      <div className="flex flex-wrap justify-center gap-2">
        {MORE_STUDY_MODES.map((mode, i) => {
          const Icon = ICONS[mode.key];
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => setActiveKey(mode.key === activeKey ? null : mode.key)}
              aria-pressed={mode.key === activeKey}
              className={cn(
                "flex animate-fade-up cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                mode.key === activeKey ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-foreground hover:bg-muted-hover",
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {mode.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <p key={active.key} className="animate-fade-up rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground ring-1 ring-border">
          <span className="font-semibold text-foreground">{active.label}:</span> {active.description}
        </p>
      ) : null}
    </div>
  );
}
