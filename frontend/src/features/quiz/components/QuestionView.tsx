import { Lightbulb } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import type { QuizQuestionOut } from "../types/quiz.types";

type Props = {
  question: QuizQuestionOut;
  index: number;
  total: number;
  isSubmitting: boolean;
  isAnswered: boolean;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  onSubmit: () => void;
};

export function QuestionView({
  question,
  index,
  total,
  isSubmitting,
  isAnswered,
  selectedOptionId,
  onSelectOption,
  onSubmit,
}: Props) {
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHintOpen(false);
    });
  }, [question.id]);

  const optionRows = useMemo(() => {
    return question.options.map((option) => {
      const isSelected = option.id === selectedOptionId;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelectOption(option.id)}
          disabled={isAnswered}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-left transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isAnswered && "cursor-not-allowed opacity-80",
            isSelected
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-surface text-foreground hover:bg-muted",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-semibold",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {option.id}
            </div>
            <div className="min-w-0 text-sm leading-relaxed">{option.text}</div>
          </div>
        </button>
      );
    });
  }, [question.options, selectedOptionId, onSelectOption, isAnswered]);

  const canSubmit = Boolean(selectedOptionId) && !isAnswered;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Pregunta <span className="font-semibold">{index + 1}</span> / {total}
        </span>
        {question.hint ? (
          <button
            type="button"
            onClick={() => setHintOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Lightbulb className="h-4 w-4" />
            Pista
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {question.question}
        </h3>

        {hintOpen && question.hint ? (
          <div
            className="mt-3 rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning"
            role="note"
          >
            {question.hint}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">{optionRows}</div>

        <div className="mt-5 flex items-center justify-end">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !canSubmit || isSubmitting
                ? "cursor-not-allowed bg-primary/40 text-primary-foreground/70"
                : "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-hover",
            )}
          >
            {isSubmitting ? "Enviando..." : "Responder"}
          </button>
        </div>
      </div>
    </div>
  );
}


