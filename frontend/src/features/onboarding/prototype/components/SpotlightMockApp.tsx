// PROTOTYPE — onboarding demo (throwaway).
import { BookOpenCheck, FileText, Layers, MessageSquare, Network, Plus, Send, Sparkles, UploadCloud } from "lucide-react";
import { useState } from "react";

import { cn } from "../../../../shared/lib/cn";
import { DEMO_NOTEBOOK, DEMO_QUESTION } from "../demoData";
import type { DemoFlow } from "../useDemoFlow";
import { DemoAnswer } from "./DemoAnswer";
import { DemoSourceItem } from "./DemoSourceItem";
import { DemoStudioPreview } from "./DemoStudioPreview";
import { DemoToolPicker } from "./DemoToolPicker";

type Region = "create" | "upload" | "ask" | "citations" | "studio";

type Props = {
  flow: DemoFlow;
  focus: Region | null;
};

const RAIL_ICONS = [Sparkles, MessageSquare, Network, BookOpenCheck, Layers, FileText];

export function SpotlightMockApp({ flow, focus }: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const region = (key: Region) =>
    cn(
      "transition-all duration-300",
      focus === key && "relative z-[55] rounded-xl ring-4 ring-primary ring-offset-4 ring-offset-background",
      focus !== null && focus !== key && "pointer-events-none opacity-30",
    );

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
        <span className="text-xl">{flow.isNotebookCreated ? DEMO_NOTEBOOK.emoji : "📚"}</span>
        <span className="font-semibold text-foreground">
          {flow.isNotebookCreated ? flow.notebookName : "Mis cuadernos"}
        </span>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          Modo demo
        </span>
      </header>

      {!flow.isNotebookCreated ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <div className={cn("w-full max-w-sm p-2", region("create"))}>
            {isCreating ? (
              <form
                className="flex animate-fade-up flex-col gap-3 rounded-xl border border-border bg-surface p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  flow.createNotebook(DEMO_NOTEBOOK.name);
                }}
              >
                <label className="text-sm font-medium text-foreground" htmlFor="demo-nb-a">Nombre del cuaderno</label>
                <input id="demo-nb-a" readOnly value={`${DEMO_NOTEBOOK.emoji} ${DEMO_NOTEBOOK.name}`} className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                <button type="submit" className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Crear</button>
              </form>
            ) : (
              <button type="button" onClick={() => setIsCreating(true)} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Plus className="h-4 w-4" /> Nuevo cuaderno
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col-reverse md:flex-row">
          <nav className={cn("flex flex-row gap-1 border-t border-border bg-muted p-2 md:flex-col md:border-r md:border-t-0", region("studio"))}>
            {RAIL_ICONS.map((Icon, i) => (
              <span key={i} className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground"><Icon className="h-5 w-5" /></span>
            ))}
          </nav>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
            <section className={cn("p-1", region("upload"))}>
              <h3 className="mb-2 text-sm font-bold text-foreground">Fuentes</h3>
              {flow.sourceStatus === "none" ? (
                <button type="button" onClick={flow.uploadSource} className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-surface p-6 text-sm text-muted-foreground hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <UploadCloud className="h-6 w-6 text-primary" />
                  Arrastra un PDF aquí o <span className="font-semibold text-primary">usa el archivo de ejemplo</span>
                </button>
              ) : (
                <DemoSourceItem status={flow.sourceStatus} />
              )}
            </section>
            {flow.step === "studio" || flow.step === "done" ? (
              <section className={cn("space-y-3 p-1", region("studio"))}>
                <h3 className="text-sm font-bold text-foreground">Modos de estudio</h3>
                <DemoToolPicker active={flow.studioTool} onPick={flow.openTool} />
                {flow.studioTool ? <div className="rounded-xl border border-border bg-surface p-4"><DemoStudioPreview tool={flow.studioTool} /></div> : null}
              </section>
            ) : (
              <section className={cn("flex flex-1 flex-col gap-3 p-1", focus === "citations" ? region("citations") : region("ask"))}>
                <h3 className="text-sm font-bold text-foreground">Chat</h3>
                {flow.isQuestionAsked ? (
                  <>
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">{DEMO_QUESTION}</div>
                    <div className="max-w-[90%] rounded-2xl border border-border bg-surface px-4 py-3">
                      <DemoAnswer revealedSegments={flow.revealedSegments} highlightCitations={focus === "citations" && !flow.hasSeenCitation} onCitationSeen={flow.markCitationSeen} />
                    </div>
                  </>
                ) : null}
                <div className="mt-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                  <span className="flex-1 truncate text-sm text-muted-foreground">{flow.isQuestionAsked ? "Pregunta algo sobre tus fuentes…" : DEMO_QUESTION}</span>
                  <button type="button" onClick={flow.ask} disabled={flow.isQuestionAsked || flow.sourceStatus !== "done"} aria-label="Enviar" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
