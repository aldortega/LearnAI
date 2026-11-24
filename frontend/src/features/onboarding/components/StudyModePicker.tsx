import { BookOpenCheck, Network, Sparkles } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { DemoStudyMode } from "../types/onboarding.types";
import { DEMO_STUDY_MODES } from "../utils/demoContent";

const ICONS = { quickstart: Sparkles, quiz: BookOpenCheck, mindmap: Network } as const;

type Props = {
  active: DemoStudyMode | null;
  onPick: (tool: DemoStudyMode) => void;
};

export function StudyModePicker({ active, onPick }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DEMO_STUDY_MODES.map((tool) => {
        const Icon = ICONS[tool.key];
        return (
          <button
            key={tool.key}
            type="button"
            onClick={() => onPick(tool.key)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active === tool.key ? "border-primary bg-primary/10" : "border-border bg-surface hover:bg-muted-hover",
            )}
          >
            <Icon className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold text-foreground">{tool.label}</span>
            <span className="hidden text-[11px] text-muted-foreground sm:block">{tool.description}</span>
          </button>
        );
      })}
    </div>
  );
}
