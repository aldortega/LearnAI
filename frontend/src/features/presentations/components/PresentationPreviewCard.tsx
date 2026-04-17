import { AlertTriangle, Layers, MoreVertical, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

import { cn } from "../../../shared/lib/cn";
import type { PresentationOut } from "../types/presentations.types";

type Props = {
  presentation: PresentationOut;
  isDeleting: boolean;
  isAnyPresentationDeleting: boolean;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
};

const VIRTUAL_WIDTH = 960;

export function PresentationPreviewCard({
  presentation,
  isDeleting,
  isAnyPresentationDeleting,
  onSelectPresentation,
  onDeletePresentation,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scale, setScale] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!previewRef.current) return;
    const width = previewRef.current.offsetWidth;
    setScale(width / VIRTUAL_WIDTH);
  }, []);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScale]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onDeletePresentation(presentation);
  };

  const slideCount = presentation.slides.length + 1;

  return (
    <div
      role="button"
      tabIndex={0}
      title={presentation.title}
      onClick={() => onSelectPresentation(presentation.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectPresentation(presentation.id);
      }}
      className={cn(
        "group relative cursor-pointer rounded-xl border border-border bg-surface transition-all duration-200",
        "hover:shadow-md hover:border-primary/25",
        isDeleting && "opacity-60 pointer-events-none",
      )}
    >
      {/* Context menu */}
      <div className="absolute right-2 top-2 z-20" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          disabled={isAnyPresentationDeleting}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md bg-surface/85 text-muted-foreground backdrop-blur-sm transition",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            "hover:bg-muted hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-60",
            isMenuOpen && "opacity-100",
          )}
          aria-label={`Opciones de ${presentation.title}`}
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 z-20 mt-1 w-36 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isAnyPresentationDeleting}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className={cn("h-3.5 w-3.5", isDeleting && "animate-pulse")} />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>

      {/* ---- Cover slide preview (scaled thumbnail) ---- */}
      <div
        ref={previewRef}
        className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-slate-100 text-slate-800"
      >
        {scale > 0 ? (
          <div
            className="pointer-events-none absolute left-0 top-0 origin-top-left"
            style={{
              width: VIRTUAL_WIDTH,
              height: VIRTUAL_WIDTH * (9 / 16),
              transform: `scale(${scale})`,
            }}
          >
            {presentation.generation_mode === "image" && presentation.slides[0]?.image_url ? (
              <img
                src={presentation.slides[0].image_url ?? ""}
                alt={presentation.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full flex-col justify-center px-14 py-10">
                <h3 className="text-[2rem] font-semibold leading-tight">
                  {presentation.title}
                </h3>
                {presentation.summary ? (
                  <p className="mt-3 text-base leading-snug opacity-75">
                    {presentation.summary}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {/* Slide count overlay */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-md bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Layers className="h-2.5 w-2.5" />
          {slideCount}
        </div>
      </div>

      {/* ---- Card body ---- */}
      <div className="relative space-y-1.5 px-3 pb-2.5 pt-2">
        <h4 className="min-w-0 line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {presentation.title}
        </h4>

        {/* Footer: stale */}
        <div className="flex items-center justify-end gap-2">
          {presentation.is_stale ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              Obsoleta
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
