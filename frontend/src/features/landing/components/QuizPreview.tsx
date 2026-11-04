import { Check } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import { PREVIEW_QUIZ } from "../utils/previewContent";

export function QuizPreview() {
  return (
    <div aria-hidden className="mt-auto rounded-xl border border-border bg-background p-4">
      <p className="font-mono text-xs text-muted-foreground">{PREVIEW_QUIZ.progress}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{PREVIEW_QUIZ.question}</p>
      <ul className="mt-4 flex flex-col gap-2">
        {PREVIEW_QUIZ.options.map((option, index) => {
          const isCorrect = index === PREVIEW_QUIZ.correctIndex;
          return (
            <li
              key={option}
              className={cn(
                "flex h-9 items-center justify-between rounded-lg border px-3 text-sm",
                isCorrect
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              {option}
              {isCorrect ? (
                <Check className="size-4 text-primary" strokeWidth={1.5} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
