// PROTOTYPE — onboarding demo (throwaway). Lista de pasos de la variante C.
import { Check } from "lucide-react";

import { cn } from "../../../../shared/lib/cn";
import { DEMO_STEPS, STEP_COPY, type DemoFlow } from "../useDemoFlow";

type Props = {
  flow: DemoFlow;
};

export function SandboxChecklist({ flow }: Props) {
  return (
    <ol className="flex flex-col gap-1">
      {DEMO_STEPS.map((step, i) => {
        const isDone = i < flow.stepIndex;
        const isCurrent = i === flow.stepIndex;
        return (
          <li key={step}>
            <button
              type="button"
              disabled={i > flow.stepIndex}
              onClick={() => flow.goTo(i)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isCurrent ? "bg-surface shadow-sm ring-1 ring-border" : "hover:bg-muted-hover",
                i > flow.stepIndex ? "cursor-not-allowed opacity-50" : "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                  isDone ? "bg-primary text-primary-foreground" : isCurrent ? "border-2 border-primary text-primary" : "border border-border text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{STEP_COPY[step].title.replace(/^\d\.\s/, "")}</span>
                {isCurrent ? <span className="mt-1 block animate-fade-up text-xs text-muted-foreground">{STEP_COPY[step].body}</span> : null}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
