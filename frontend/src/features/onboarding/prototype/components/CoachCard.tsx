// PROTOTYPE — onboarding demo (throwaway).
import { cn } from "../../../../shared/lib/cn";
import { Button } from "../../../../shared/ui/Button";
import { STEP_COPY, type DemoFlow } from "../useDemoFlow";

type Props = {
  flow: DemoFlow;
  canContinue: boolean;
  hint?: string;
  centered: boolean;
  onFinish: () => void;
};

export function CoachCard({ flow, canContinue, hint, centered, onFinish }: Props) {
  const copy = STEP_COPY[flow.step];
  const isLast = flow.step === "done";

  return (
    <div
      role="dialog"
      aria-label={copy.title}
      className={cn(
        "fixed z-[60] w-[calc(100%-2rem)] animate-fade-up rounded-2xl border border-border bg-surface p-5 shadow-2xl",
        centered
          ? "left-1/2 top-1/2 max-w-md -translate-x-1/2 -translate-y-1/2"
          : "bottom-20 left-1/2 max-w-sm -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0",
      )}
      key={flow.step}
    >
      <div className="mb-3 flex gap-1">
        {Array.from({ length: flow.totalSteps }).map((_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= flow.stepIndex ? "bg-primary" : "bg-border")} />
        ))}
      </div>
      <h2 className="text-lg font-bold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
      {hint && !canContinue ? (
        <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">👉 {hint}</p>
      ) : null}
      <div className="mt-4 flex items-center justify-between gap-2">
        {isLast ? (
          <Button variant="ghost" onClick={flow.restart}>Ver de nuevo</Button>
        ) : (
          <Button variant="ghost" onClick={onFinish}>Saltar</Button>
        )}
        <div className="flex gap-2">
          {flow.stepIndex > 0 && !isLast ? (
            <Button variant="ghost" onClick={flow.back}>Atrás</Button>
          ) : null}
          <Button onClick={isLast ? onFinish : flow.next} disabled={!canContinue}>
            {flow.step === "welcome" ? "Empezar" : isLast ? "Crear mi primer cuaderno" : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
