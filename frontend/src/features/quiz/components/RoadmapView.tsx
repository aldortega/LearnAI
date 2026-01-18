import { Lock, ShieldCheck, Unlock } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { RoadmapLevelOut, RoadmapOut } from "../types/quiz.types";

type Props = {
  roadmap: RoadmapOut;
  selectedLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
};

function getLevelIcon(level: RoadmapLevelOut) {
  if (level.status === "locked") return <Lock className="h-4 w-4" />;
  if (level.status === "passed") return <ShieldCheck className="h-4 w-4" />;
  return <Unlock className="h-4 w-4" />;
}

export function RoadmapView({ roadmap, selectedLevelId, onSelectLevel }: Props) {
  return (
    <div className="space-y-6">
      {roadmap.units.map((unit) => (
        <section key={unit.id} className="space-y-3">
          <header>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {unit.order}. {unit.title}
                </h3>
                {unit.description ? (
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {unit.description}
                  </p>
                ) : null}
              </div>
            </div>
          </header>

          <div className="grid gap-2">
            {unit.levels
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((level) => {
                const isSelected = selectedLevelId === level.id;
                const isLocked = level.status === "locked";

                return (
                  <button
                    key={level.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSelectLevel(level.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      isLocked
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
                      isSelected &&
                        !isLocked &&
                        "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid h-8 w-8 flex-none place-items-center rounded-lg",
                          isLocked
                            ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : level.status === "passed"
                              ? "bg-emerald-900 text-white dark:bg-emerald-300 dark:text-emerald-950"
                              : "bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200",
                        )}
                      >
                        {getLevelIcon(level)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{level.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {level.type === "exam" ? "Examen" : "Leccion"} · Aprobacion {level.passing_score}%
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      {typeof level.best_score === "number" ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            level.status === "passed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                          )}
                        >
                          {level.best_score}%
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs font-semibold",
                          isLocked
                            ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            : level.status === "passed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
                        )}
                      >
                        {level.status === "locked"
                          ? "Bloqueado"
                          : level.status === "passed"
                            ? "Aprobado"
                            : "Disponible"}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
