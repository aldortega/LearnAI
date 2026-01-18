import { BookOpenCheck } from "lucide-react";

import { Button } from "../../../shared/ui/Button";

type Props = {
  isGenerating: boolean;
  canStartQuiz: boolean;
  error: string | null;
  onGenerate: () => void;
};

export function GenerateQuizCard({
  isGenerating,
  canStartQuiz,
  error,
  onGenerate,
}: Props) {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-200">
          <BookOpenCheck className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {isGenerating ? "Generando quiz…" : "Todavia no hay quiz"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Para generar el roadmap, asegurate de tener fuentes listas y usa el boton Quiz.
        </p>

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
            onClick={onGenerate}
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
