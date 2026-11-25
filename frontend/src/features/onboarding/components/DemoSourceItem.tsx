import { CheckCircle, FileText, Loader2 } from "lucide-react";

import { DEMO_SOURCE_FILE } from "../utils/demoContent";

type Props = {
  status: "processing" | "done";
  progress: number;
};

function getProgressLabel(progress: number): string {
  if (progress < 20) return "Subiendo…";
  if (progress < 55) return "Leyendo el documento…";
  return "Indexando fragmentos…";
}

export function DemoSourceItem({ status, progress }: Props) {
  const isDone = status === "done";
  return (
    <div className="flex animate-fade-up items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      {isDone ? (
        <CheckCircle className="h-4 w-4 shrink-0 animate-pop-in text-primary motion-reduce:animate-none" aria-label="Lista" />
      ) : (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-label="Procesando" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{DEMO_SOURCE_FILE}</p>
        {isDone ? (
          <p className="animate-fade-up text-xs text-primary">Lista · 24 páginas indexadas</p>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-100" style={{ width: `${progress}%` }} />
            </div>
            <span className="w-32 shrink-0 text-xs text-muted-foreground">{getProgressLabel(progress)}</span>
          </div>
        )}
      </div>
      <FileText className="h-[18px] w-[18px] shrink-0 text-primary" />
    </div>
  );
}
