// PROTOTYPE — onboarding demo (throwaway). Escena animada por paso para la variante B.
import { ArrowRight, BookOpen, PartyPopper, Sparkles, UploadCloud } from "lucide-react";

import { DEMO_CITATIONS, DEMO_NOTEBOOK, DEMO_QUESTION } from "../demoData";
import type { DemoFlow } from "../useDemoFlow";
import { DemoAnswer } from "./DemoAnswer";
import { DemoMoreModes } from "./DemoMoreModes";
import { DemoSourceItem } from "./DemoSourceItem";
import { DemoStudioPreview } from "./DemoStudioPreview";
import { DemoToolPicker } from "./DemoToolPicker";

type Props = {
  flow: DemoFlow;
};

const PILLARS = [
  { icon: BookOpen, label: "Creá un cuaderno" },
  { icon: UploadCloud, label: "Subí tus fuentes" },
  { icon: Sparkles, label: "Estudiá" },
];

export function CarouselScene({ flow }: Props) {
  switch (flow.step) {
    case "welcome":
      return (
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          {PILLARS.map((p, i) => (
            <div key={p.label} className="flex items-center gap-2 sm:gap-4">
              <div className="flex animate-fade-up flex-col items-center gap-2" style={{ animationDelay: `${i * 200}ms` }}>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary"><p.icon className="h-7 w-7" /></span>
                <span className="text-xs font-semibold text-foreground">{p.label}</span>
              </div>
              {i < PILLARS.length - 1 ? <ArrowRight className="h-4 w-4 text-muted-foreground" /> : null}
            </div>
          ))}
        </div>
      );
    case "create":
      return (
        <div className="mx-auto w-full max-w-xs rounded-xl border border-border bg-surface p-4 shadow-sm">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Nuevo cuaderno</p>
          <div className="flex items-center gap-2 rounded-lg border border-primary px-3 py-2">
            <span className="text-lg">{DEMO_NOTEBOOK.emoji}</span>
            <span className="overflow-hidden whitespace-nowrap text-sm font-semibold text-foreground">
              {flow.isNotebookCreated ? DEMO_NOTEBOOK.name : <span className="animate-pulse">|</span>}
            </span>
          </div>
          {flow.isNotebookCreated ? (
            <p className="mt-3 flex animate-fade-up items-center gap-2 text-xs font-medium text-primary"><BookOpen className="h-4 w-4" /> Cuaderno creado</p>
          ) : null}
        </div>
      );
    case "upload":
      return (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
          <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border-strong bg-surface p-4 text-xs text-muted-foreground">
            <UploadCloud className="h-6 w-6 text-primary" /> PDF · DOCX · TXT
          </div>
          {flow.sourceStatus !== "none" ? <DemoSourceItem status={flow.sourceStatus} /> : null}
        </div>
      );
    case "ask":
      return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <div className="ml-auto max-w-[85%] animate-fade-up rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">{DEMO_QUESTION}</div>
          {flow.isQuestionAsked ? (
            <div className="max-w-[92%] rounded-2xl border border-border bg-surface px-4 py-3">
              <DemoAnswer revealedSegments={flow.revealedSegments} />
            </div>
          ) : null}
        </div>
      );
    case "citations":
      return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-2">
          <div className="rounded-2xl border border-border bg-surface px-4 py-3">
            <DemoAnswer revealedSegments={99} highlightCitations onCitationSeen={flow.markCitationSeen} />
          </div>
          <div className="ml-6 animate-fade-up rounded-xl border border-border bg-surface p-3 text-xs shadow-xl">
            <p className="text-sm font-semibold text-foreground">{DEMO_CITATIONS[0].file_name}</p>
            <p className="text-muted-foreground">Página {DEMO_CITATIONS[0].page}</p>
            <p className="mt-1 line-clamp-3 text-muted-foreground">{DEMO_CITATIONS[0].snippet}</p>
          </div>
        </div>
      );
    case "studio":
      return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <DemoToolPicker active={flow.studioTool} onPick={flow.openTool} />
          {flow.studioTool ? (
            <div key={flow.studioTool} className="animate-fade-up rounded-xl border border-border bg-surface p-4">
              <DemoStudioPreview tool={flow.studioTool} />
            </div>
          ) : null}
        </div>
      );
    case "done":
      return (
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
          <span className="grid h-14 w-14 animate-fade-up place-items-center rounded-full bg-primary/10 text-primary"><PartyPopper className="h-7 w-7" /></span>
          <DemoMoreModes />
        </div>
      );
  }
}
