import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "../../../shared/lib/cn";
import type { QuickstartTopic } from "../types/quickstart.types";

type Props = {
  topic: QuickstartTopic;
  notebookId?: string;
  isStale: boolean;
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
  isStale,
  canDelete,
  isDeleting,
  onDeleteTopic,
  cardRef,
  isDragging,
  dropEdge,
}: Props) {
  const navigate = useNavigate();
  const canOpenTopic = Boolean(notebookId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleOpenTopic = () => {
    if (!notebookId || isDragging) return;
    navigate(`/notebook/${notebookId}/quickstart/topic/${topic.id}`);
  };

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleToggleMenu = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDelete || isDeleting) return;
    setIsMenuOpen((current) => !current);
  };

  const handleDeleteTopic = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!canDelete || isDeleting) return;
    setIsMenuOpen(false);
    onDeleteTopic(topic);
  };

  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-foreground transition group-hover:text-primary">
            {topic.title}
          </p>
          <p className="mt-2 text-sm text-foreground/80">{topic.summary}</p>
        </div>
      </div>

      {isStale ? (
        <p className="mt-3 text-xs text-warning" role="alert">
          Este inicio rapido esta desactualizado. Regenera para actualizar el detalle.
        </p>
      ) : null}
    </>
  );

  return (
    <div className="relative">
      {dropEdge ? (
        <span
          className={cn(
            "pointer-events-none absolute left-4 right-4 z-30 h-0.5 rounded-full bg-primary",
            dropEdge === "top" ? "top-0" : "bottom-0",
          )}
        />
      ) : null}
      {canDelete ? (
        <div ref={menuRef} className="absolute right-3 top-3 z-20">
          <button
            type="button"
            onClick={handleToggleMenu}
            disabled={isDeleting}
            aria-label={`Opciones del tema ${topic.title}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            title="Opciones"
            className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div
              role="menu"
              aria-label={`Acciones para ${topic.title}`}
              className="absolute right-0 mt-2 min-w-36 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleDeleteTopic}
                disabled={isDeleting}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-error transition hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Eliminar tema
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {canOpenTopic ? (
        <button
          ref={cardRef}
          type="button"
          onClick={handleOpenTopic}
          className={cn(
            "group w-full rounded-2xl border border-border bg-surface p-5 pr-14 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            isDragging ? "cursor-grabbing opacity-70" : "cursor-pointer",
          )}
        >
          {content}
        </button>
      ) : (
        <div
          ref={cardRef}
          className={cn(
            "group rounded-2xl border border-border bg-surface p-5 shadow-sm",
            isDragging ? "cursor-grabbing opacity-70" : "cursor-pointer",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
