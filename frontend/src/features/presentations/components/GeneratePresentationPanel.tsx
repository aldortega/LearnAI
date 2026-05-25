import { Presentation } from "lucide-react";
import { useId } from "react";

import { Button } from "../../../shared/ui/Button";
import type {
  PresentationDetailLevel,
  PresentationGenerationMode,
} from "../types/presentations.types";

const DETAIL_LEVEL_OPTIONS: { value: PresentationDetailLevel; label: string; hint: string }[] = [
  { value: "concise", label: "Concisa", hint: "Puntos clave breves para acompanar exposicion oral." },
  { value: "detailed", label: "Detallada", hint: "Mas contexto y explicaciones para lectura guiada." },
];

type Props = {
  topic: string;
  detailLevel: PresentationDetailLevel;
  generationMode: PresentationGenerationMode;
  disabled: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onTopicChange: (value: string) => void;
  onDetailLevelChange: (value: PresentationDetailLevel) => void;
  onGenerationModeChange: (value: PresentationGenerationMode) => void;
  onGenerate: () => void;
};

export function GeneratePresentationPanel({
  topic,
  detailLevel,
  generationMode,
  disabled,
  isGenerating,
  canGenerate,
  error,
  onTopicChange,
  onDetailLevelChange,
  onGenerationModeChange,
  onGenerate,
}: Props) {
  const inputId = useId();

  const activeDetailHint = DETAIL_LEVEL_OPTIONS.find((o) => o.value === detailLevel)?.hint ?? "";

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Presentation className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          {isGenerating ? "Generando presentacion…" : "Todavia no hay presentacion"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Define el tema y nivel de detalle para generar slides con tus fuentes.
        </p>

        <div className="mt-6 space-y-4 text-left">
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
              Tema
            </label>
            <input
              id={inputId}
              type="text"
              value={topic}
              onChange={(e) => onTopicChange(e.target.value)}
              placeholder="Ej. Fundamentos de redes neuronales"
              disabled={disabled}
              className={
                "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-all duration-200 " +
                "placeholder:text-muted-foreground " +
                "focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none " +
                "hover:border-border-strong " +
                "disabled:cursor-not-allowed disabled:opacity-60"
              }
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Nivel de detalle</p>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              {DETAIL_LEVEL_OPTIONS.map((option) => {
                const isActive = option.value === detailLevel;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onDetailLevelChange(option.value)}
                    disabled={disabled}
                    className={
                      "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                      (isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted-hover/60 hover:text-muted-foreground") +
                      (disabled ? " cursor-not-allowed opacity-60" : "")
                    }
                    aria-pressed={isActive}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {activeDetailHint ? (
              <p className="mt-2 text-xs text-muted-foreground">{activeDetailHint}</p>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Formato de slides</p>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => onGenerationModeChange("text")}
                disabled={disabled}
                className={
                  "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                  (generationMode === "text"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-hover/60 hover:text-muted-foreground") +
                  (disabled ? " cursor-not-allowed opacity-60" : "")
                }
                aria-pressed={generationMode === "text"}
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => onGenerationModeChange("image")}
                disabled={disabled}
                className={
                  "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                  (generationMode === "image"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-hover/60 hover:text-muted-foreground") +
                  (disabled ? " cursor-not-allowed opacity-60" : "")
                }
                aria-pressed={generationMode === "image"}
              >
                Imagen 🍌
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div
            className="mt-4 rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Button
            onClick={onGenerate}
            loading={isGenerating}
            disabled={disabled || !topic.trim()}
          >
            Generar presentacion
          </Button>
        </div>

        {!canGenerate ? (
          <p className="mt-3 text-xs text-muted-foreground" role="alert">
            Necesitas al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}
