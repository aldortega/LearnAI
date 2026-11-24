// PROTOTYPE — onboarding demo (throwaway). Tarea interactiva del paso actual en la variante C.
import { MousePointerClick, PartyPopper, Sparkles, UploadCloud } from "lucide-react";
import { useState } from "react";

import { DEMO_NOTEBOOK, DEMO_QUESTION, DEMO_SUGGESTED_QUESTIONS } from "../demoData";
import type { DemoFlow } from "../useDemoFlow";
import { DemoAnswer } from "./DemoAnswer";
import { DemoSourceItem } from "./DemoSourceItem";
import { DemoStudioPreview } from "./DemoStudioPreview";
import { DemoToolPicker } from "./DemoToolPicker";

type Props = {
  flow: DemoFlow;
};

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const primaryClass = "cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function SandboxTask({ flow }: Props) {
  const [draftName, setDraftName] = useState(DEMO_NOTEBOOK.name);

  switch (flow.step) {
    case "welcome":
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Sparkles className="h-8 w-8" /></span>
          <p className="max-w-sm text-sm text-muted-foreground">Este es un espacio de práctica. Nada de lo que hagas aquí se guarda.</p>
          <button type="button" className={primaryClass} onClick={flow.next}>Empezar la práctica</button>
        </div>
      );
    case "create":
      return (
        <form className="flex w-full max-w-sm flex-col gap-3" onSubmit={(e) => { e.preventDefault(); flow.createNotebook(draftName.trim() || DEMO_NOTEBOOK.name); }}>
          <label htmlFor="demo-nb-c" className="text-sm font-semibold text-foreground">¿Qué quieres estudiar?</label>
          <input id="demo-nb-c" className={inputClass} value={draftName} onChange={(e) => setDraftName(e.target.value)} disabled={flow.isNotebookCreated} />
          <button type="submit" className={primaryClass} disabled={flow.isNotebookCreated}>
            {flow.isNotebookCreated ? `✓ «${flow.notebookName}» creado` : "Crear cuaderno"}
          </button>
        </form>
      );
    case "upload":
      return (
        <div className="flex w-full max-w-sm flex-col gap-3">
          {flow.sourceStatus === "none" ? (
            <button type="button" onClick={flow.uploadSource} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-surface p-8 text-sm text-muted-foreground hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <UploadCloud className="h-8 w-8 text-primary" />
              <span className="font-semibold text-foreground">Usar archivo de ejemplo</span>
              <span className="text-xs">En tu cuaderno real, aquí arrastras tus PDF, DOCX o TXT</span>
            </button>
          ) : (
            <DemoSourceItem status={flow.sourceStatus} />
          )}
        </div>
      );
    case "ask":
    case "citations":
      return (
        <div className="flex w-full max-w-md flex-col gap-3">
          {flow.isQuestionAsked ? (
            <>
              <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">{DEMO_QUESTION}</div>
              <div className="rounded-2xl border border-border bg-surface px-4 py-3">
                <DemoAnswer revealedSegments={flow.revealedSegments} highlightCitations={flow.step === "citations" && !flow.hasSeenCitation} onCitationSeen={flow.markCitationSeen} />
              </div>
              {flow.step === "citations" && !flow.hasSeenCitation ? (
                <p className="flex items-center gap-2 text-xs font-medium text-primary"><MousePointerClick className="h-4 w-4" /> Pasa el cursor o toca un número</p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground">Elige una pregunta sugerida</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_SUGGESTED_QUESTIONS.map((q) => (
                  <button key={q} type="button" onClick={flow.ask} disabled={q !== DEMO_QUESTION} className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    case "studio":
      return (
        <div className="flex w-full max-w-md flex-col gap-3">
          <DemoToolPicker active={flow.studioTool} onPick={flow.openTool} />
          {flow.studioTool ? (
            <div key={flow.studioTool} className="animate-fade-up rounded-xl border border-border bg-surface p-4"><DemoStudioPreview tool={flow.studioTool} /></div>
          ) : null}
        </div>
      );
    case "done":
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary"><PartyPopper className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">Completaste la práctica. Ahora hazlo con tus propios apuntes.</p>
        </div>
      );
  }
}
