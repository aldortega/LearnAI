import { Lock, ShieldCheck, Unlock } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type {
  RoadmapLevelOut,
  RoadmapOut,
  RoadmapQuestionStatus,
} from "../types/quiz.types";

type Props = {
  roadmap: RoadmapOut;
  selectedLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onRetryLevel?: (levelId: string) => void;
  retryingLevelId?: string | null;
};

function getLevelIcon(level: RoadmapLevelOut) {
  if (level.status === "locked") return <Lock className="h-4 w-4" />;
  if (level.status === "passed") return <ShieldCheck className="h-4 w-4" />;
  return <Unlock className="h-4 w-4" />;
}

function getQuestionStatusLabel(status?: RoadmapQuestionStatus | null) {
  switch (status) {
    case "idle":
      return "Preguntas pendientes";
    case "generating":
      return "Generando preguntas";
    case "failed":
      return "Error en preguntas";
    default:
      return "Preguntas listas";
  }
}

export function RoadmapView({
  roadmap,
  selectedLevelId,
  onSelectLevel,
  onRetryLevel,
  retryingLevelId,
}: Props) {
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
                const questionsStatus = level.questions_status ?? "idle";
                const isLocked = level.status === "locked";
                const bestScore =
                  typeof level.best_score === "number" ? level.best_score : null;
                const hasScore = bestScore !== null;
                const isFailed =
                  !isLocked &&
                  level.status !== "passed" &&
                  hasScore &&
                  bestScore < level.passing_score;
                const questionStatusLabel = getQuestionStatusLabel(questionsStatus);
                const availabilityLabel = (() => {
                  if (level.status === "locked") return "Bloqueado";
                  if (questionsStatus === "failed") return "Error";
                  if (questionsStatus === "idle") return "Pendiente";
                  if (questionsStatus === "generating") return "Generando";
                  if (level.status === "passed") return "Aprobado";
                  if (isFailed) return "Reprobado";
                  return "Disponible";
                })();
                const isRetrying = retryingLevelId === level.id;
                const canRetry = Boolean(onRetryLevel) && !isRetrying;

                return (
                  <button
                    key={level.id}
                    type="button"
                    disabled={isLocked}
                    onClick={() => onSelectLevel(level.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500",
                      isLocked
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
                        : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
                      isSelected &&
                        !isLocked &&
                        "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid h-8 w-8 flex-none place-items-center rounded-lg",
                          isLocked
                            ? "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : level.status === "passed"
                              ? "bg-green-900 text-white dark:bg-green-300 dark:text-green-950"
                              : "bg-green-200 text-green-900 dark:bg-green-500/20 dark:text-green-200",
                        )}
                      >
                        {getLevelIcon(level)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{level.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {level.type === "exam" ? "Examen" : "Leccion"} ·
                          Aprobacion {level.passing_score}% · {questionStatusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      {typeof level.best_score === "number" ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            level.status === "passed"
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                          )}
                        >
                          {level.best_score}%
                        </span>
                      ) : null}
                      {isFailed ? (
                        <span
                          className={
                            "group/failed relative inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
                            "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200"
                          }
                        >
                          <span>Reprobado</span>
                          <span
                            className={cn(
                              "absolute left-full ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              "bg-rose-200/80 text-rose-900 transition group-hover/failed:opacity-100",
                              "pointer-events-none group-hover/failed:pointer-events-auto",
                              "dark:bg-rose-400/30 dark:text-rose-100",
                              canRetry
                                ? "cursor-pointer opacity-0"
                                : "cursor-not-allowed opacity-0",
                            )}
                            onClick={(event) => {
                              if (!canRetry) return;
                              event.preventDefault();
                              event.stopPropagation();
                              onRetryLevel?.(level.id);
                            }}
                            aria-label="Reintentar nivel"
                            title="Reintentar"
                          >
                            {isRetrying ? "Reintentando" : "Reintento"}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            isLocked
                              ? "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              : level.status === "passed"
                                ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
                          )}
                        >
                          {availabilityLabel}
                        </span>
                      )}
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
