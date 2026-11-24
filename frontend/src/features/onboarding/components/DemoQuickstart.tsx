import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { DEMO_QUICKSTART } from "../utils/demoContent";

export function DemoQuickstart() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-foreground/90">{DEMO_QUICKSTART.summary}</p>
      <div className="flex flex-col">
        {DEMO_QUICKSTART.topics.map((topic, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={topic.title} className="animate-fade-up border-b border-border/60 last:border-b-0" style={{ animationDelay: `${i * 120}ms` }}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-sm py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/60">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg leading-none">{topic.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-foreground group-hover:text-primary">{topic.title}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen ? (
                <ul className="mb-2 ml-12 animate-fade-up list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {topic.keyPoints.map((point) => <li key={point}>{point}</li>)}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
