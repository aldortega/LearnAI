import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";

import { Button } from "../../../shared/ui/Button";
import { SlideEditPromptPanel } from "./SlideEditPromptPanel";
import type {
  PresentationOut,
  PresentationSlide,
} from "../types/presentations.types";

type Props = {
  presentation: PresentationOut | null;
  selectedSlideIndex: number;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  isLoading: boolean;
  error: string | null;
  downloadPdfError: string | null;
  candidateSlide: PresentationSlide | null;
  candidateSlideError: string | null;
  isRegeneratingSlide: boolean;
  isApplyingSlide: boolean;
  isEditPanelOpen: boolean;
  canEditCurrentSlide: boolean;
  editPrompt: string;
  onApplyCandidateSlide: () => void;
  onDiscardCandidateSlide: () => void;
  onEditPromptChange: (value: string) => void;
  onRegenerateSlide: () => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.closest("[contenteditable='true']") !== null
  );
}

function ensureMultilineBullets(value: string): string {
  return value.replace(/(?<!\n)([:.;])\s+([*-])\s+/g, "$1\n\n$2 ");
}

export function PresentationViewer({
  presentation,
  selectedSlideIndex,
  isFirstSlide,
  isLastSlide,
  onPreviousSlide,
  onNextSlide,
  isLoading,
  error,
  downloadPdfError,
  candidateSlide,
  candidateSlideError,
  isRegeneratingSlide,
  isApplyingSlide,
  isEditPanelOpen,
  canEditCurrentSlide,
  editPrompt,
  onApplyCandidateSlide,
  onDiscardCandidateSlide,
  onEditPromptChange,
  onRegenerateSlide,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [slideWidth, setSlideWidth] = useState<number | null>(null);
  const hasCoverSlide = presentation?.generation_mode !== "image";
  const isCoverSlide = hasCoverSlide && selectedSlideIndex === 0;
  const activeSlide = useMemo(() => {
    if (!presentation) return null;
    if (isCoverSlide) return null;
    const contentIndex = hasCoverSlide ? selectedSlideIndex - 1 : selectedSlideIndex;
    const currentSlide = presentation.slides[contentIndex] ?? presentation.slides[0] ?? null;
    if (!currentSlide) return null;
    if (!candidateSlide || candidateSlide.index !== selectedSlideIndex) {
      return currentSlide;
    }
    return candidateSlide;
  }, [candidateSlide, hasCoverSlide, isCoverSlide, presentation, selectedSlideIndex]);
  const hasCandidateForCurrentSlide = Boolean(
    candidateSlide && !isCoverSlide && candidateSlide.index === selectedSlideIndex,
  );
  const slideBoxStyle = { width: slideWidth ? `${slideWidth}px` : "100%" };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (!isFirstSlide) {
          onPreviousSlide();
        }
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (!isLastSlide) {
          onNextSlide();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFirstSlide, isLastSlide, onNextSlide, onPreviousSlide]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      const availableWidth = viewport.clientWidth;
      const availableHeight = viewport.clientHeight;
      if (availableWidth <= 0 || availableHeight <= 0) {
        setSlideWidth(null);
        return;
      }

      const widthByHeight = (availableHeight * 16) / 9;
      setSlideWidth(Math.max(1, Math.floor(Math.min(availableWidth, widthByHeight))));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  if (isLoading) {
    return (
      <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Cargando presentacion...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="h-full rounded-2xl border border-error bg-error/10 p-6 shadow-sm">
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!presentation) {
    return (
      <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Selecciona una presentacion para ver su contenido.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2">
      <div className="space-y-2">
        {downloadPdfError ? (
          <p className="text-sm text-error" role="alert">
            {downloadPdfError}
          </p>
        ) : null}
        {presentation.is_stale ? (
          <p className="rounded-lg border border-warning bg-warning/10 px-3 py-2 text-sm text-warning">
            Esta presentacion puede estar desactualizada por cambios en fuentes.
          </p>
        ) : null}
        {candidateSlideError ? (
          <p className="text-sm text-error" role="alert">
            {candidateSlideError}
          </p>
        ) : null}
      </div>

      {hasCandidateForCurrentSlide && !isApplyingSlide ? (
        <div className="mx-auto w-full max-w-4xl">
          <div
            className="mx-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-muted px-3 py-2"
            style={slideBoxStyle}
          >
            <p className="text-sm text-foreground">
              Tienes una propuesta de edicion sin guardar para esta diapositiva.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={isApplyingSlide}
                onClick={onDiscardCandidateSlide}
              >
                Mantener original
              </Button>
              <Button
                variant="primary"
                disabled={isApplyingSlide}
                onClick={onApplyCandidateSlide}
              >
                Aplicar cambios
              </Button>
            </div>
          </div>
        </div>
      ) : isEditPanelOpen && canEditCurrentSlide && !isRegeneratingSlide ? (
        <div className="mx-auto w-full max-w-4xl">
          <div
            className="mx-auto rounded-xl border border-border bg-muted px-3 py-2"
            style={slideBoxStyle}
          >
            <SlideEditPromptPanel
              isOpen={isEditPanelOpen}
              prompt={editPrompt}
              isRegenerating={isRegeneratingSlide}
              error={candidateSlideError}
              onPromptChange={onEditPromptChange}
              onRegenerate={onRegenerateSlide}
            />
          </div>
        </div>
      ) : null}

      <div ref={viewportRef} className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-start justify-center">
        <article
          className="aspect-video rounded-2xl border border-border bg-slate-50 p-5 text-slate-900 shadow-sm [container-type:inline-size]"
          style={slideBoxStyle}
        >
          {isRegeneratingSlide ? (
            <div className="flex h-full flex-col gap-3 animate-pulse">
              <div className="h-7 w-2/3 rounded-lg bg-slate-200" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-200" />
              <div className="mt-2 h-4 w-full rounded-lg bg-slate-200" />
              <div className="h-4 w-11/12 rounded-lg bg-slate-200" />
              <div className="h-4 w-10/12 rounded-lg bg-slate-200" />
              <div className="h-4 w-9/12 rounded-lg bg-slate-200" />
            </div>
          ) : isCoverSlide ? (
            <div className="flex h-full flex-col justify-center">
              <h3 className="text-[clamp(1.1rem,3.5cqi,2rem)] font-semibold leading-[1.1]">
                {presentation.title}
              </h3>
              <p className="mt-2 text-[clamp(0.85rem,1.9cqi,1.1rem)] leading-[1.2] opacity-90">
                {presentation.summary}
              </p>
            </div>
          ) : activeSlide ? (
            <div className="flex h-full flex-col">
              {activeSlide.format === "image" ? (
                <div className="min-h-0 flex-1 overflow-hidden rounded-xl bg-slate-100">
                  {activeSlide.image_url ? (
                    <img
                      src={activeSlide.image_url}
                      alt={activeSlide.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-sm opacity-80">No hay imagen para esta diapositiva.</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="mt-3 text-[clamp(0.98rem,2.7cqi,1.45rem)] font-semibold leading-[1.1]">
                    {activeSlide.title}
                  </h3>
                  {activeSlide.subtitle ? (
                    <p className="mt-2 text-[clamp(0.8rem,1.65cqi,1rem)] leading-[1.2] opacity-85">
                      {activeSlide.subtitle}
                    </p>
                  ) : null}
                  <div
                    className="
               mt-2 min-h-0 flex-1 overflow-hidden pr-1 text-[clamp(0.76rem,1.48cqi,0.96rem)] leading-[1.2]
               [&_h1]:mb-2 [&_h1]:text-[clamp(0.98rem,2.45cqi,1.25rem)] [&_h1]:font-semibold [&_h1]:leading-[1.1]
               [&_h2]:mb-1.5 [&_h2]:text-[clamp(0.93rem,2.1cqi,1.14rem)] [&_h2]:font-semibold [&_h2]:leading-[1.1]
              [&_h3]:mb-1 [&_h3]:text-[clamp(0.86rem,1.82cqi,1.04rem)] [&_h3]:font-semibold [&_h3]:leading-[1.1]
              [&_p]:my-1
              [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5
              [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5
              [&_li]:my-0
              [&_strong]:font-semibold
            "
                  >
                    <Streamdown controls={{ table: false, code: false }}>
                      {ensureMultilineBullets(activeSlide.content_markdown ?? "")}
                    </Streamdown>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm opacity-85">No hay contenido de slides para mostrar.</p>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
