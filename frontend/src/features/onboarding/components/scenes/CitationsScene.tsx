import { DEMO_ANSWER, DEMO_CITATION } from "../../utils/demoContent";
import { DemoAnswer } from "../DemoAnswer";

export function CitationsScene() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2">
      <div className="rounded-2xl border border-border bg-surface px-4 py-3">
        <DemoAnswer revealedSegments={DEMO_ANSWER.length} highlightCitations />
      </div>
      <div className="ml-6 animate-fade-up rounded-xl border border-border bg-surface p-3 text-xs shadow-xl">
        <p className="text-sm font-semibold text-foreground">{DEMO_CITATION.file_name}</p>
        <p className="text-muted-foreground">Página {DEMO_CITATION.page}</p>
        <p className="mt-1 line-clamp-3 text-muted-foreground">{DEMO_CITATION.snippet}</p>
      </div>
    </div>
  );
}
