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
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            isAnswered && "cursor-not-allowed opacity-80",
            isSelected
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100"
              : "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900",
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "grid h-7 w-7 flex-none place-items-center rounded-lg text-xs font-semibold",
                isSelected
                  ? "bg-emerald-900 text-white dark:bg-emerald-300 dark:text-emerald-950"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
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
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          Pregunta <span className="font-semibold">{index + 1}</span> / {total}
        </span>
        {question.hint ? (
          <button
            type="button"
            onClick={() => setHintOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white"
          >
            <Lightbulb className="h-4 w-4" />
            Pista
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
          {question.question}
        </h3>

        {hintOpen && question.hint ? (
          <div
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
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
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
              !canSubmit || isSubmitting
                ? "cursor-not-allowed bg-emerald-900/40 text-white/70 dark:bg-emerald-400/40 dark:text-emerald-950/70"
                : "bg-emerald-900 text-white hover:bg-emerald-800 active:bg-emerald-950 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300 dark:active:bg-emerald-500",
            )}
          >
            {isSubmitting ? "Enviando..." : "Responder"}
          </button>
        </div>
      </div>
    </div>
  );
}
