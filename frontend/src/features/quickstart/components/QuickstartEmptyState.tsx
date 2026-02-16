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
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          {isGenerating ? "Generando inicio rápido..." : "Todavía no hay inicio rápido"}
        </h2>
        <p className="mt-2 text-sm text-foreground/75">
          Genera un resumen de temas para presentar tu notebook rapidamente.
        </p>

        {error ? (
          <div
            className="mt-4 rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
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
          <p className="mt-3 text-xs text-foreground/70" role="alert">
            Necesitas al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}

