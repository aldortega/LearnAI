import { Button } from "../../../shared/ui/Button";
import { TextArea } from "../../../shared/ui/TextArea";
import { cn } from "../../../shared/lib/cn";
import { PresentationStyleGrid } from "./PresentationStyleGrid";
import type {
  PresentationDetailLevel,
  PresentationStyle,
  PresentationStyleTemplate,
} from "../types/presentations.types";

type Props = {
  topic: string;
  styles: PresentationStyleTemplate[];
  selectedStyle: PresentationStyle;
  detailLevel: PresentationDetailLevel;
  disabled: boolean;
  isGenerating: boolean;
  onTopicChange: (value: string) => void;
  onSelectStyle: (style: PresentationStyle) => void;
  onDetailLevelChange: (value: PresentationDetailLevel) => void;
  onGenerate: () => void;
};

export function GeneratePresentationPanel({
  topic,
  styles,
  selectedStyle,
  detailLevel,
  disabled,
  isGenerating,
  onTopicChange,
  onSelectStyle,
  onDetailLevelChange,
  onGenerate,
}: Props) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Nueva presentacion</h3>
        <p className="text-sm text-muted-foreground">
          Define tema, estilo visual y densidad del contenido para generar las slides.
        </p>
      </div>

      <TextArea
        label="Tema"
        name="topic"
        value={topic}
        onChange={onTopicChange}
        placeholder="Ej. Fundamentos de redes neuronales"
        required
        rows={3}
      />

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Nivel de detalle</p>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDetailLevelChange("concise")}
            disabled={disabled}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition",
              detailLevel === "concise"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            Concisa
          </button>
          <button
            type="button"
            onClick={() => onDetailLevelChange("detailed")}
            disabled={disabled}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition",
              detailLevel === "detailed"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-surface text-muted-foreground hover:bg-muted",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            Detallada
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {detailLevel === "concise"
            ? "Puntos clave breves para acompanar exposicion oral."
            : "Mas contexto y explicaciones para lectura guiada."}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Estilo visual</p>
        <PresentationStyleGrid
          styles={styles}
          selectedStyle={selectedStyle}
          disabled={disabled}
          onSelectStyle={onSelectStyle}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={onGenerate} loading={isGenerating} disabled={disabled || !topic.trim()}>
          Generar presentacion
        </Button>
      </div>
    </section>
  );
}
