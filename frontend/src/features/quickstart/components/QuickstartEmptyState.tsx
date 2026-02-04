import { Sparkles } from "lucide-react";

import { Button } from "../../../shared/ui/Button";

type Props = {
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onGenerate: () => void;
};

export function QuickstartEmptyState({
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: Props) {
  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200">
          <Sparkles className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {isGenerating ? "Generando inicio rapido..." : "Todavia no hay inicio rapido"}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Genera un resumen de temas para presentar tu notebook rapidamente.
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
          <Button onClick={onGenerate} disabled={!canGenerate} loading={isGenerating}>
            Generar inicio rapido
          </Button>
        </div>

        {!canGenerate ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400" role="alert">
            Necesitas al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}
