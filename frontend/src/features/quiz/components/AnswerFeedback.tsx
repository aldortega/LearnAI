import { CheckCircle2, XCircle } from "lucide-react";

import { cn } from "../../../shared/lib/cn";

type Props = {
  isCorrect: boolean;
  explanation: string;
  correctOptionId: string;
  showCorrectOption: boolean;
  levelScore?: number;
  passed?: boolean;
};

export function AnswerFeedback({
  isCorrect,
  explanation,
  correctOptionId,
  showCorrectOption,
  levelScore,
  passed,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        isCorrect
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
          : "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {isCorrect ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {isCorrect ? "Correcto" : "Incorrecto"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
            {explanation}
          </p>

          {!isCorrect && showCorrectOption ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Respuesta correcta: <span className="font-semibold">{correctOptionId}</span>
            </p>
          ) : null}

          {typeof levelScore === "number" ? (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Puntaje del nivel: <span className="font-semibold">{levelScore}%</span>
              {typeof passed === "boolean" ? (
                <>
                  {" "}
                  (<span className="font-semibold">{passed ? "Aprobado" : "No aprobado"}</span>)
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
