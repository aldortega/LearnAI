import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

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

  const sourceNames = useMemo(() => {
    if (!expansion?.sources?.length) return [];
    const names = expansion.sources
      .map((source) => source.file_name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  }, [expansion?.sources]);

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
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {topic.title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Puntos clave
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
          {topic.key_points.map((point, index) => (
            <li key={`${topic.id}-point-${index}`}>{point}</li>
          ))}
        </ul>
      </div>

      {isStale ? (
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-300" role="alert">
          Este inicio rapido esta desactualizado. Regenera para ver mas detalle.
        </p>
      ) : null}

      {isOpen ? (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {isLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cargando detalle...
            </p>
          ) : null}

          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300" role="alert">
              {error}
            </p>
          ) : null}

          {expansion ? (
            <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Fuentes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sourceNames.map((name) => (
                      <span
                        key={`${topic.id}-source-${name}`}
                        className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200"
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
