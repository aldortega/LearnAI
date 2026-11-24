import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { DEMO_QUIZ } from "../utils/demoContent";

export function DemoQuiz() {
  const [selected, setSelected] = useState<number | null>(null);
  const isAnswered = selected !== null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{DEMO_QUIZ.question}</p>
      <div className="grid gap-2">
        {DEMO_QUIZ.options.map((option, i) => (
          <button
            key={option}
            type="button"
            disabled={isAnswered}
            onClick={() => setSelected(i)}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              !isAnswered && "cursor-pointer border-border bg-surface hover:bg-muted-hover",
              isAnswered && i === DEMO_QUIZ.correctIndex && "border-success bg-success/10 text-foreground",
              isAnswered && i === selected && i !== DEMO_QUIZ.correctIndex && "border-error bg-error/10",
              isAnswered && i !== selected && i !== DEMO_QUIZ.correctIndex && "border-border opacity-60",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {isAnswered ? (
        <p className="animate-fade-up text-xs text-muted-foreground">
          {selected === DEMO_QUIZ.correctIndex ? "¡Correcto! " : "Casi. "}
          {DEMO_QUIZ.explanation} <span className="font-medium text-primary">[pág. 12]</span>
        </p>
      ) : null}
    </div>
  );
}
