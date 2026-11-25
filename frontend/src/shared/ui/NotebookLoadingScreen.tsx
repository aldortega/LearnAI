import { GraduationCap } from "lucide-react";

import { cn } from "../lib/cn";

type Props = {
  message?: string;
};

const RAIL_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const BLOCK = "rounded-md bg-muted-hover";
const SHIMMER =
  "h-full w-1/2 bg-gradient-to-r from-transparent via-surface/70 to-transparent animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] motion-reduce:hidden";

export function NotebookLoadingScreen({
  message = "Cargando cuaderno...",
}: Props) {
  return (
    <div role="status" className="flex h-dvh flex-col overflow-hidden bg-surface">
      <span className="sr-only">{message}</span>

      <div
        aria-hidden="true"
        className="flex h-16 flex-none items-center justify-between gap-3 border-b border-border px-4 sm:px-6"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="hidden text-lg font-bold tracking-tight text-primary sm:inline">
            LearnAI
          </span>
          <div className="hidden h-4 w-px bg-muted-hover sm:block" />
          <div className={cn(BLOCK, "h-3.5 w-24")} />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-20 rounded-full bg-muted-hover" />
          <div className="h-8 w-8 rounded-full bg-muted-hover" />
          <div className="h-9 w-9 rounded-full bg-muted-hover" />
        </div>
      </div>

      <div aria-hidden="true" className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-16 flex-none flex-col items-center gap-1 border-r border-border bg-muted py-3 md:flex">
          {RAIL_SLOTS.map((slot) => (
            <div key={slot} className="grid h-10 w-10 place-items-center">
              <div className="h-6 w-6 rounded-lg bg-muted-hover" />
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[45px] flex-none items-center gap-2 border-b border-border px-4">
            <div className={cn(BLOCK, "h-3.5 w-28")} />
          </div>
          <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-8 sm:px-8">
            <div className={cn(BLOCK, "mb-6 h-6 w-2/5")} />
            <div className={cn(BLOCK, "h-3 w-full")} />
            <div className={cn(BLOCK, "h-3 w-11/12")} />
            <div className={cn(BLOCK, "h-3 w-full")} />
            <div className={cn(BLOCK, "h-3 w-3/5")} />
            <div className={cn(BLOCK, "mt-10! mb-4 h-5 w-1/3")} />
            <div className="h-40 rounded-2xl bg-muted-hover" />
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0">
          <div className={SHIMMER} />
        </div>
      </div>
    </div>
  );
}
