import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "../../../shared/lib/cn";
import type { QuickstartTopic } from "../types/quickstart.types";
import { resolveTopicEmoji } from "../utils/topicEmoji";

type Props = {
  topic: QuickstartTopic;
  position: number;
  notebookId?: string;
  canDelete: boolean;
  isDeleting: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDnDEnabled: boolean;
  onDeleteTopic: (topic: QuickstartTopic) => void;
  onMoveTopic: (topicId: string, direction: -1 | 1) => void;
  cardRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
  dropEdge: "top" | "bottom" | null;
};

export function QuickstartTopicCard({
  topic,
  position,
  notebookId,
  canDelete,
  isDeleting,
  canMoveUp,
  canMoveDown,
  isDnDEnabled,
  onDeleteTopic,
  onMoveTopic,
  cardRef,
  isDragging,
  dropEdge,
}: Props) {
  const navigate = useNavigate();
  const canOpenTopic = Boolean(notebookId);
  const numeral = String(position + 1).padStart(2, "0");
  const topicEmoji = resolveTopicEmoji(topic.emoji);

  const handleOpenTopic = () => {
    if (!notebookId || isDragging) return;
    navigate(`/notebook/${notebookId}/quickstart/topic/${topic.id}`);
  };

  const handleDeleteTopic = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDelete || isDeleting) return;
    onDeleteTopic(topic);
  };

  const handleMove = (direction: -1 | 1) => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (isDeleting) return;
    if (direction === -1 && !canMoveUp) return;
    if (direction === 1 && !canMoveDown) return;
    onMoveTopic(topic.id, direction);
  };

  const rowClasses = cn(
    "group/row relative grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 sm:gap-4 px-2 sm:px-3 py-3.5 transition-colors",
    "border-b border-border/60 last:border-b-0",
    isDragging ? "opacity-50" : "hover:bg-muted/40",
  );

  return (
    <div ref={cardRef} className="relative">
      {dropEdge ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 right-0 z-30 h-0.5 rounded-full bg-primary",
            dropEdge === "top" ? "-top-px" : "-bottom-px",
          )}
        />
      ) : null}

      <div className={rowClasses}>
        {isDnDEnabled ? (
          <span
            aria-hidden
            className={cn(
              "hidden sm:flex h-6 w-4 items-center justify-center text-muted-foreground/40 transition-colors",
              isDragging ? "text-primary cursor-grabbing" : "cursor-grab group-hover/row:text-muted-foreground/80",
            )}
            title="Arrastra para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <span aria-hidden className="hidden sm:block w-4" />
        )}

        <span
          aria-hidden
          className={cn(
            "font-mono text-[11px] font-medium tabular-nums tracking-tight text-muted-foreground/60 transition-colors",
            "group-hover/row:text-foreground/70",
          )}
        >
          {numeral}
        </span>

        <span aria-hidden className="text-2xl leading-none">
          {topicEmoji}
        </span>

        <button
          type="button"
          onClick={handleOpenTopic}
          disabled={!canOpenTopic}
          title={topic.title}
          className={cn(
            "min-w-0 text-left",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-sm",
            canOpenTopic ? "cursor-pointer" : "cursor-default",
          )}
        >
          <span className="block truncate text-[15px] font-semibold leading-tight text-foreground transition-colors group-hover/row:text-primary">
            {topic.title}
          </span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={handleMove(-1)}
            disabled={!canMoveUp || isDeleting}
            aria-label={`Mover ${topic.title} hacia arriba`}
            title="Mover arriba"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleMove(1)}
            disabled={!canMoveDown || isDeleting}
            aria-label={`Mover ${topic.title} hacia abajo`}
            title="Mover abajo"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={handleDeleteTopic}
              disabled={isDeleting}
              aria-label={`Eliminar tema ${topic.title}`}
              title="Eliminar tema"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-error/10 hover:text-error focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
