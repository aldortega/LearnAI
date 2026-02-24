import { useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";

import { cn } from "../../../shared/lib/cn";
import type { PresentationOut } from "../types/presentations.types";

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
};

const styleCardClasses: Record<PresentationOut["style"], string> = {
  clean: "bg-slate-50 text-slate-900",
  corporate: "bg-slate-900 text-slate-100",
  creative: "bg-indigo-950 text-indigo-50",
  academic: "bg-stone-50 text-stone-900",
  minimal: "bg-white text-slate-900",
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
}: Props) {
  const isCoverSlide = selectedSlideIndex === 0;
  const activeSlide = useMemo(() => {
    if (!presentation) return null;
    if (isCoverSlide) return null;
    const contentIndex = selectedSlideIndex - 1;
    return presentation.slides[contentIndex] ?? presentation.slides[0] ?? null;
  }, [isCoverSlide, presentation, selectedSlideIndex]);

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
    <section className="flex h-full flex-col gap-4">
      <div className="space-y-3">
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

        <div className="mx-auto w-full max-w-4xl space-y-3">
          <article
            className={cn(
              "aspect-video w-full rounded-2xl border border-border p-5 shadow-sm [container-type:inline-size]",
              styleCardClasses[presentation.style],
            )}
          >
            {isCoverSlide ? (
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
              [&_p]:my-1.5
              [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5
              [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5
              [&_li]:my-0.5
              [&_strong]:font-semibold
            "
                >
                  <Streamdown controls={{ table: false, code: false }}>{activeSlide.content_markdown}</Streamdown>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm opacity-85">No hay contenido de slides para mostrar.</p>
              </div>
            )}
          </article>

        </div>
      </div>

    </section>
  );
}
