import { FileText, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../../shared/lib/cn";
import type { PresentationOut } from "../types/presentations.types";

type Props = {
  presentations: PresentationOut[];
  selectedPresentationId: string | null;
  deletingPresentationId: string | null;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
};

type PresentationPreviewCardProps = {
  presentation: PresentationOut;
  isSelected: boolean;
  isDeleting: boolean;
  isAnyPresentationDeleting: boolean;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
};

function PresentationPreviewCard({
  presentation,
  isSelected,
  isDeleting,
  isAnyPresentationDeleting,
  onSelectPresentation,
  onDeletePresentation,
}: PresentationPreviewCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeletePresentation = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onDeletePresentation(presentation);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectPresentation(presentation.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectPresentation(presentation.id);
      }}
      className={cn(
        "group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60",
        isSelected && "bg-muted/50",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground group-hover:text-primary">
          {presentation.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {presentation.summary || "Sin resumen."}
        </p>
        {presentation.is_stale ? (
          <p className="mt-1 text-xs text-warning">Obsoleta por cambios de fuentes</p>
        ) : null}
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          disabled={isAnyPresentationDeleting}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Opciones de ${presentation.title}`}
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={handleDeletePresentation}
              disabled={isAnyPresentationDeleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className={cn("h-4 w-4", isDeleting && "animate-pulse")} />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PresentationsHistoryList({
  presentations,
  selectedPresentationId,
  deletingPresentationId,
  onSelectPresentation,
  onDeletePresentation,
}: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">
        Presentaciones generadas{" "}
        <span className="font-normal text-muted-foreground">
          ({presentations.length})
        </span>
      </h3>
      {presentations.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
          Aun no hay presentaciones generadas.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface">
          {presentations.map((presentation) => (
            <div key={presentation.id}>
              <PresentationPreviewCard
                presentation={presentation}
                isSelected={selectedPresentationId === presentation.id}
                isDeleting={deletingPresentationId === presentation.id}
                isAnyPresentationDeleting={Boolean(deletingPresentationId)}
                onSelectPresentation={onSelectPresentation}
                onDeletePresentation={onDeletePresentation}
              />
              {presentation.id !== presentations[presentations.length - 1]?.id ? (
                <div className="mx-4 border-t border-border" />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
