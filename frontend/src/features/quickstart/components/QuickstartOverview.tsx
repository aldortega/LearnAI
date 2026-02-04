import { RefreshCcw } from "lucide-react";

import { Card } from "../../../shared/ui/Card";
import { Button } from "../../../shared/ui/Button";
import type { QuickstartOut } from "../types/quickstart.types";
import { QuickstartTopicsList } from "./QuickstartTopicsList";

type Props = {
  quickstart: QuickstartOut;
  notebookId?: string;
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onGenerate: () => void;
};

export function QuickstartOverview({
  quickstart,
  notebookId,
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: Props) {
  const isStale = quickstart.status === "stale";

  const formattedDate = quickstart.generated_at
    ? new Date(quickstart.generated_at).toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-8">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Inicio rapido
              </p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Resumen de temas
              </h2>
              {formattedDate ? (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Generado el {formattedDate}
                </p>
              ) : null}
            </div>
            <Button
              onClick={onGenerate}
              disabled={!canGenerate}
              loading={isGenerating}
              leftIcon={<RefreshCcw className="h-4 w-4" />}
            >
              {isStale ? "Regenerar" : "Actualizar"}
            </Button>
          </div>

          {isStale ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              role="alert"
            >
              Se detectaron cambios en tus fuentes. Regenera para mantener el inicio
              rapido actualizado.
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}
        </Card>

        <QuickstartTopicsList
          topics={quickstart.topics}
          notebookId={notebookId}
          isStale={isStale}
        />
      </div>
    </div>
  );
}
