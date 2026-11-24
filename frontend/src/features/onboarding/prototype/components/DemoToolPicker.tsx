// PROTOTYPE — onboarding demo (throwaway).
import { BookOpenCheck, Network, Sparkles } from "lucide-react";

import { cn } from "../../../../shared/lib/cn";
import { STUDIO_TOOLS, type StudioTool } from "../demoData";

const ICONS = { quickstart: Sparkles, quiz: BookOpenCheck, mindmap: Network } as const;

type Props = {
  active: StudioTool | null;
  onPick: (tool: StudioTool) => void;
};

export function DemoToolPicker({ active, onPick }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STUDIO_TOOLS.map((tool) => {
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
