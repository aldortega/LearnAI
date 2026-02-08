import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { Button } from "../../../shared/ui/Button";
import type { QuickstartTopic } from "../types/quickstart.types";
import { useQuickstartExpansion } from "../hooks/useQuickstartExpansion";

type Props = {
  topic: QuickstartTopic;
  notebookId?: string;
  isStale: boolean;
};

export function QuickstartTopicCard({ topic, notebookId, isStale }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { expansion, isLoading, error, expand, clearError } =
    useQuickstartExpansion(notebookId, topic.id);

  const sourceNames = expansion?.sources?.length
    ? Array.from(
        new Set(
          expansion.sources
            .map((source) => source.file_name)
            .filter((name): name is string => Boolean(name)),
        ),
      )
    : [];

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    if (isStale) return;

    setIsOpen(true);
    clearError();
    await expand();
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">
            {topic.title}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {topic.summary}
          </p>
        </div>
        <Button
          variant="ghost"
          className="shrink-0"
          onClick={handleToggle}
          disabled={isStale}
          rightIcon={
            isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          }
        >
          {isOpen ? "Ocultar" : "Expandir"}
        </Button>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Puntos clave
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {topic.key_points.map((point, index) => (
            <li key={`${topic.id}-point-${index}`}>{point}</li>
          ))}
        </ul>
      </div>

      {isStale ? (
        <p className="mt-3 text-xs text-warning" role="alert">
          Este inicio rapido esta desactualizado. Regenera para ver mas detalle.
        </p>
      ) : null}

      {isOpen ? (
        <div className="mt-4 border-t border-border pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Cargando detalle...
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          {expansion ? (
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="space-y-3">
                {expansion.content
                  .split(/\n+/)
                  .map((paragraph) => paragraph.trim())
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${topic.id}-paragraph-${index}`}>{paragraph}</p>
                  ))}
              </div>

              {expansion.key_points.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Puntos adicionales
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {expansion.key_points.map((point, index) => (
                      <li key={`${topic.id}-extra-${index}`}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {expansion.example_questions.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preguntas sugeridas
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {expansion.example_questions.map((question, index) => (
                      <li key={`${topic.id}-question-${index}`}>{question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {sourceNames.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Fuentes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sourceNames.map((name) => (
                      <span
                        key={`${topic.id}-source-${name}`}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

