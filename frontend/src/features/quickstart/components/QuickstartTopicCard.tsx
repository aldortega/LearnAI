import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import type { QuickstartTopic } from "../types/quickstart.types";

type Props = {
  topic: QuickstartTopic;
  notebookId?: string;
  isStale: boolean;
};

export function QuickstartTopicCard({ topic, notebookId, isStale }: Props) {
  const navigate = useNavigate();
  const canOpenTopic = Boolean(notebookId);

  const handleOpenTopic = () => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quickstart/topic/${topic.id}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="cursor-pointer text-left text-base font-semibold text-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
            onClick={handleOpenTopic}
            disabled={!canOpenTopic}
          >
            {topic.title}
          </button>
          <p className="mt-2 text-sm text-muted-foreground">{topic.summary}</p>
        </div>
        <Button
          variant="ghost"
          className="shrink-0 border border-border"
          onClick={handleOpenTopic}
          disabled={!canOpenTopic}
          rightIcon={<ArrowUpRight className="h-4 w-4" />}
        >
          Ver tema
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
          Este inicio rapido esta desactualizado. Regenera para actualizar el detalle.
        </p>
      ) : null}
    </div>
  );
}
