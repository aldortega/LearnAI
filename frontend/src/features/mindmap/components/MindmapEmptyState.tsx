import { Network } from "lucide-react";
import { useState } from "react";

import { Button } from "../../../shared/ui/Button";

const PROMPT_MAX_LENGTH = 1200;

type Props = {
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onGenerate: (prompt?: string) => void;
};

export function MindmapEmptyState({
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const handleGenerate = () => {
    const trimmedPrompt = prompt.trim();
    onGenerate(trimmedPrompt ? trimmedPrompt : undefined);
  };

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
        <div className="mt-6 space-y-2 text-left">
          <label
            htmlFor="mindmap-topic-prompt"
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Tema especifico (opcional)
          </label>
          <textarea
            id="mindmap-topic-prompt"
            value={prompt}
            disabled={isGenerating || !canGenerate}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            maxLength={PROMPT_MAX_LENGTH}
            placeholder="Ejemplo: Arquitectura cliente-servidor en redes"
            className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-right text-xs text-muted-foreground">
            {prompt.length}/{PROMPT_MAX_LENGTH}
          </p>
        </div>
        <div className="mt-6">
          <Button
            variant="primary"
            onClick={handleGenerate}
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
