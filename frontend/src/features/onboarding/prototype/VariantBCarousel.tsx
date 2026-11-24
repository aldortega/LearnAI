// PROTOTYPE — Variante B: modal tipo carrusel con escenas animadas que se reproducen solas. El usuario solo mira y avanza.
import { X } from "lucide-react";
import { useEffect } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";
import { CarouselScene } from "./components/CarouselScene";
import { DEMO_NOTEBOOK } from "./demoData";
import { STEP_COPY, type DemoFlow } from "./useDemoFlow";

type Props = {
  flow: DemoFlow;
  onClose: () => void;
};

export function VariantBCarousel({ flow, onClose }: Props) {
  const { step, isNotebookCreated, sourceStatus, isQuestionAsked, studioTool, createNotebook, uploadSource, ask, openTool } = flow;
  const copy = STEP_COPY[step];
  const isLast = step === "done";

  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    if (step === "create" && !isNotebookCreated) later(() => createNotebook(DEMO_NOTEBOOK.name), 900);
    if (step === "upload" && sourceStatus === "none") later(uploadSource, 500);
    if (step === "ask" && !isQuestionAsked) later(ask, 700);
    if (step === "studio" && !studioTool) later(() => openTool("quickstart"), 600);
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [step, isNotebookCreated, sourceStatus, isQuestionAsked, studioTool, createNotebook, uploadSource, ask, openTool]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-border">
        <button type="button" onClick={onClose} aria-label="Cerrar tutorial" className="absolute right-3 top-3 z-10 cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <X className="h-5 w-5" />
        </button>
        <div className="flex min-h-64 items-center justify-center overflow-y-auto bg-muted px-6 py-8 sm:min-h-80" key={step}>
          <CarouselScene flow={flow} />
        </div>
        <div className="flex flex-col gap-4 p-6">
          <div key={step} className="animate-fade-up">
            <h2 className="text-xl font-bold text-foreground">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5" role="tablist" aria-label="Pasos">
              {Array.from({ length: flow.totalSteps }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === flow.stepIndex}
                  aria-label={`Paso ${i + 1}`}
                  onClick={() => flow.goTo(i)}
                  className={cn("h-2 cursor-pointer rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", i === flow.stepIndex ? "w-6 bg-primary" : "w-2 bg-border hover:bg-border-strong")}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {flow.stepIndex > 0 && !isLast ? <Button variant="ghost" onClick={flow.back}>Atrás</Button> : null}
              {flow.stepIndex === 0 ? <Button variant="ghost" onClick={onClose}>Saltar</Button> : null}
              <Button onClick={isLast ? onClose : flow.next}>
                {step === "welcome" ? "Ver cómo funciona" : isLast ? "Crear mi primer cuaderno" : "Siguiente"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
