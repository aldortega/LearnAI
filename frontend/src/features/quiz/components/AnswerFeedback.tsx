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
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-error bg-error/10 text-error",
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
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {explanation}
          </p>

          {!isCorrect && showCorrectOption ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Respuesta correcta: <span className="font-semibold">{correctOptionId}</span>
            </p>
          ) : null}

          {typeof levelScore === "number" ? (
            <p className="mt-2 text-xs text-muted-foreground">
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


