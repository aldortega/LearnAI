import { Network } from "lucide-react";

import { Button } from "../../../shared/ui/Button";

type Props = {
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onGenerate: () => void;
};

export function MindmapEmptyState({
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: Props) {
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Network className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Mapa mental</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Genera un mapa mental de tu notebook y explora sus ramas de forma interactiva.
        </p>
        <div className="mt-6">
          <Button
            variant="primary"
            onClick={onGenerate}
            loading={isGenerating}
            disabled={!canGenerate || isGenerating}
          >
            Generar mapa mental
          </Button>
        </div>
        {!canGenerate ? (
          <p className="mt-4 text-sm text-muted-foreground" role="alert">
            Necesitas al menos una fuente lista para generar el mapa mental.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
