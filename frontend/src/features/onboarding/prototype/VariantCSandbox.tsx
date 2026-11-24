// PROTOTYPE — Variante C: pantalla dividida con checklist + zona de práctica. Avanza sola al completar cada acción.
import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../../../shared/ui/Button";
import { SandboxChecklist } from "./components/SandboxChecklist";
import { SandboxTask } from "./components/SandboxTask";
import type { DemoFlow } from "./useDemoFlow";

type Props = {
  flow: DemoFlow;
  onClose: () => void;
};

const AUTO_ADVANCE_MS = 1100;

function isStepComplete(flow: DemoFlow): boolean {
  switch (flow.step) {
    case "create": return flow.isNotebookCreated;
    case "upload": return flow.sourceStatus === "done";
    case "ask": return flow.isAnswerComplete;
    case "citations": return flow.hasSeenCitation;
    case "studio": return false;
    default: return false;
  }
}

export function VariantCSandbox({ flow, onClose }: Props) {
  const isComplete = isStepComplete(flow);
  const { next } = flow;

  useEffect(() => {
    if (!isComplete) return;
    const id = window.setTimeout(next, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [isComplete, next, flow.step]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:flex-row" role="dialog" aria-modal="true" aria-label="Tutorial de LearnAI">
      <aside className="flex flex-col gap-4 border-b border-border bg-muted p-4 md:w-80 md:border-b-0 md:border-r md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Tutorial</p>
            <h2 className="text-lg font-bold text-foreground">Aprende LearnAI</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar tutorial" className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto md:max-h-none md:flex-1">
          <SandboxChecklist flow={flow} />
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="ghost" onClick={onClose}>Saltar tutorial</Button>
        </div>
      </aside>
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
          <span className="text-sm font-medium text-muted-foreground">
            {flow.isNotebookCreated ? `🌿 ${flow.notebookName}` : "Espacio de práctica"}
          </span>
          {flow.step === "studio" || flow.step === "done" ? (
            <Button onClick={flow.step === "done" ? onClose : next} disabled={flow.step === "studio" && !flow.studioTool}>
              {flow.step === "done" ? "Crear mi primer cuaderno" : "Terminar"}
            </Button>
          ) : null}
        </div>
        <div key={flow.step} className="flex flex-1 animate-fade-up items-center justify-center overflow-y-auto p-6">
          <SandboxTask flow={flow} />
        </div>
      </main>
    </div>
  );
}
