import { BookOpenCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "../../../shared/ui/Button";
import type {
  QuizDifficulty,
  QuizGenerateRequest,
  QuizLength,
} from "../types/quiz.types";

type Props = {
  isGenerating: boolean;
  canStartQuiz: boolean;
  error: string | null;
  onGenerate: (options: QuizGenerateRequest) => void;
};

export function GenerateQuizCard({
  isGenerating,
  canStartQuiz,
  error,
  onGenerate,
}: Props) {
  const [length, setLength] = useState<QuizLength>("long");
  const [difficulty, setDifficulty] = useState<QuizDifficulty>("basic");

  const handleGenerate = () => {
    onGenerate({ length, difficulty });
  };

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">
          <BookOpenCheck className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {isGenerating ? "Generando quiz…" : "Todavia no hay quiz"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Elegi el tamano y la dificultad para generar el quiz con tus fuentes.
        </p>

        <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Tamano del quiz
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
              {([
                { value: "short", label: "Corto" },
                { value: "medium", label: "Medio" },
                { value: "long", label: "Largo" },
              ] as const).map((option) => {
                const isActive = option.value === length;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLength(option.value)}
                    className={
                      "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " +
                      (isActive
                        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
                        : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200")
                    }
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Largo mantiene el tamano actual del quiz.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Dificultad
            </p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
              {([
                { value: "basic", label: "Basica" },
                { value: "intermediate", label: "Intermedia" },
                { value: "advanced", label: "Avanzada" },
              ] as const).map((option) => {
                const isActive = option.value === difficulty;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDifficulty(option.value)}
                    className={
                      "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 " +
                      (isActive
                        ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
                        : "text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200")
                    }
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error ? (
          <div
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={!canStartQuiz}
            loading={isGenerating}
          >
            Generar quiz
          </Button>
        </div>

        {!canStartQuiz ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400" role="alert">
            Necesitas al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}
