import { Layers } from "lucide-react";

export function PresentationPreviewSkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted p-4">
        <div className="h-full w-full animate-pulse space-y-2 rounded-lg bg-surface/70 p-3">
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-2.5 w-full rounded bg-muted" />
          <div className="h-2.5 w-5/6 rounded bg-muted" />
        </div>
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/35 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Layers className="h-2.5 w-2.5" />
          ...
        </div>
      </div>

      <div className="space-y-2 px-3 pb-2.5 pt-2">
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
        <div className="flex items-center justify-between gap-2">
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-5 w-20 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-center text-[10px] font-medium text-primary">
            Generando...
          </div>
        </div>
      </div>
    </div>
  );
}
