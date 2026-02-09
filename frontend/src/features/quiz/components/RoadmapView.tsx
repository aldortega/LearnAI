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
                <h3 className="text-sm font-semibold text-foreground">
                  {unit.order}. {unit.title}
                </h3>
                {unit.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
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
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isLocked
                        ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                        : "border-border bg-surface text-foreground hover:bg-muted",
                      isSelected &&
                        !isLocked &&
                        "border-primary/40 bg-primary/10",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "grid h-8 w-8 flex-none place-items-center rounded-lg",
                          isLocked
                            ? "bg-muted-hover text-muted-foreground"
                            : level.status === "passed"
                              ? "bg-primary text-primary-foreground"
                              : "bg-primary/20 text-primary",
                        )}
                      >
                        {getLevelIcon(level)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{level.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {level.type === "exam" ? "Examen" : "Lección"} ·
                          Aprobación {level.passing_score}% · {questionStatusLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      {typeof level.best_score === "number" ? (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            level.status === "passed"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {level.best_score}%
                        </span>
                      ) : null}
                      {isFailed ? (
                        <span className="group/failed relative inline-flex">
                          <span className="invisible rounded-full px-2.5 py-1 text-xs font-semibold">
                            Reintentando
                          </span>
                          <span
                            className={cn(
                              "absolute inset-0 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity",
                              "bg-error/10 text-error",
                              isRetrying
                                ? "opacity-0"
                                : "opacity-100 group-hover/failed:opacity-0",
                            )}
                          >
                            Reprobado
                          </span>
                          <span
                            className={cn(
                              "absolute inset-0 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold transition-opacity",
                              "bg-error/20 text-error dark:bg-error/20",
                              isRetrying && "cursor-wait opacity-100",
                              !isRetrying &&
                                canRetry &&
                                "cursor-pointer opacity-0 pointer-events-none group-hover/failed:pointer-events-auto group-hover/failed:opacity-100",
                              !isRetrying &&
                                !canRetry &&
                                "cursor-not-allowed opacity-0 pointer-events-none",
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
                            {isRetrying ? "Reintentando" : "Reintentar"}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            isLocked
                              ? "bg-muted-hover text-muted-foreground"
                              : level.status === "passed"
                                ? "bg-primary/15 text-primary"
                                : "bg-warning/15 text-warning",
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


