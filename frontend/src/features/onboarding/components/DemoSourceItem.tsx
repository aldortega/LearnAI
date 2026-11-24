import { CheckCircle, FileText, Loader2 } from "lucide-react";

import { DEMO_SOURCE_FILE } from "../utils/demoContent";
import type { DemoSourceStatus } from "../types/onboarding.types";

type Props = {
  status: Exclude<DemoSourceStatus, "none">;
};

export function DemoSourceItem({ status }: Props) {
  return (
    <div className="flex animate-fade-up items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      {status === "done" ? (
        <CheckCircle className="h-4 w-4 text-primary" aria-label="Lista" />
      ) : (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Procesando" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{DEMO_SOURCE_FILE}</p>
        <p className="text-xs text-muted-foreground">
          {status === "done" ? "Lista · 24 páginas indexadas" : "Procesando e indexando…"}
        </p>
      </div>
      <FileText className="h-[18px] w-[18px] text-primary" />
    </div>
  );
}
