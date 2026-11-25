import { Check, Lightbulb, X } from "lucide-react";
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
  correctOptionId: string | null;
  onSelectOption: (optionId: string) => void;
};

export function QuestionView({
  question,
  index,
  total,
  isSubmitting,
  isAnswered,
  selectedOptionId,
  correctOptionId,
  onSelectOption,
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
      const hasVerdict = isAnswered && correctOptionId !== null;
      const isCorrectOption = hasVerdict && option.id === correctOptionId;
      const isWrongSelection = hasVerdict && isSelected && !isCorrectOption;
      const isDimmed = hasVerdict && !isCorrectOption && !isWrongSelection;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelectOption(option.id)}
          disabled={isAnswered || isSubmitting}
          className={cn(
            "w-full rounded-xl border px-4 py-3 text-left transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            isAnswered && "cursor-not-allowed",
            isSubmitting && "cursor-wait",
            isDimmed && "opacity-60",
            isWrongSelection && "animate-shake motion-reduce:animate-none",
            isCorrectOption
              ? "border-primary bg-primary/10 text-primary"
              : isWrongSelection
                ? "border-error bg-error/10 text-error"
                : isSelected
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground",
            !isAnswered && !isSelected && "hover:bg-muted",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-semibold transition-colors",
                isCorrectOption
                  ? "bg-primary text-primary-foreground"
                  : isWrongSelection
                    ? "bg-error text-surface"
                    : isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {isCorrectOption ? (
                <Check className="h-4 w-4 animate-pop-in motion-reduce:animate-none" aria-hidden="true" />
              ) : isWrongSelection ? (
                <X className="h-4 w-4 animate-pop-in motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                option.id
              )}
            </div>
            <div className="min-w-0 text-sm leading-relaxed">{option.text}</div>
          </div>
        </button>
      );
    });
  }, [question.options, selectedOptionId, correctOptionId, onSelectOption, isAnswered, isSubmitting]);

  return (
    <div key={question.id} className="space-y-4 animate-fade-up motion-reduce:animate-none">
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
            className="mt-3 rounded-xl border border-warning bg-warning/10 px-4 py-3 text-sm text-warning animate-fade-up motion-reduce:animate-none"
            role="note"
          >
            {question.hint}
          </div>
        ) : null}

        <div className="mt-4 space-y-3">{optionRows}</div>
      </div>
    </div>
  );
}


