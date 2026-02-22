import { Trash2 } from "lucide-react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "../../../shared/lib/cn";
import type { QuickstartTopic } from "../types/quickstart.types";

type Props = {
  topic: QuickstartTopic;
  notebookId?: string;
  canDelete: boolean;
  isDeleting: boolean;
  onDeleteTopic: (topic: QuickstartTopic) => void;
  cardRef: (element: HTMLElement | null) => void;
  isDragging: boolean;
  dropEdge: "top" | "bottom" | null;
};

export function QuickstartTopicCard({
  topic,
  notebookId,
  canDelete,
  isDeleting,
  onDeleteTopic,
  cardRef,
  isDragging,
  dropEdge,
}: Props) {
  const navigate = useNavigate();
  const canOpenTopic = Boolean(notebookId);

  const handleOpenTopic = () => {
    if (!notebookId || isDragging) return;
    navigate(`/notebook/${notebookId}/quickstart/topic/${topic.id}`);
  };

  const handleDeleteTopic = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDelete || isDeleting) return;
    onDeleteTopic(topic);
  };
  const topicEmoji = topic.emoji?.trim() || "📘";

  const content = (
    <>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <span className="text-lg leading-none" aria-hidden>
          {topicEmoji}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight text-foreground transition group-hover:text-primary">
          {topic.title}
        </p>
      </div>
    </>
  );

  return (
    <div className="group relative">
      {dropEdge ? (
        <span
          className={cn(
            "pointer-events-none absolute left-4 right-4 z-30 h-0.5 rounded-full bg-primary",
            dropEdge === "top" ? "top-0" : "bottom-0",
          )}
        />
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={handleDeleteTopic}
          disabled={isDeleting}
          aria-label={`Eliminar tema ${topic.title}`}
          title="Eliminar tema"
          className="absolute right-2 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-error opacity-0 transition hover:bg-error/10 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
      {canOpenTopic ? (
        <button
          ref={cardRef}
          type="button"
          onClick={handleOpenTopic}
          className={cn(
            "flex w-full items-center gap-4 rounded-lg px-4 py-3.5 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            canDelete ? "pr-14" : "",
            isDragging ? "cursor-grabbing opacity-70" : "cursor-pointer",
          )}
        >
          {content}
        </button>
      ) : (
        <div
          ref={cardRef}
          className={cn(
            "flex items-center gap-4 rounded-lg px-4 py-3.5 transition",
            canDelete ? "pr-14" : "",
            isDragging ? "cursor-grabbing opacity-70" : "cursor-pointer",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
