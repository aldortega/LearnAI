import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";

import { cn } from "../../../shared/lib/cn";
import type { PresentationOut } from "../types/presentations.types";

type Props = {
  presentation: PresentationOut | null;
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

export function PresentationViewer({
  presentation,
  isLoading,
  error,
  downloadPdfError,
}: Props) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  const activeSlide = useMemo(() => {
    if (!presentation) return null;
    if (presentation.slides.length === 0) return null;
    return presentation.slides[selectedSlideIndex] ?? presentation.slides[0];
  }, [presentation, selectedSlideIndex]);

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

  if (!presentation || !activeSlide) {
    return (
      <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Selecciona una presentacion para ver su contenido.
        </p>
      </section>
    );
  }

  return (
    <section className="grid h-full grid-cols-12 gap-4">
      <aside className="col-span-4 rounded-2xl border border-border bg-surface p-3">
        <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Slides
        </p>
        <div className="mt-2 space-y-1 overflow-y-auto">
          {presentation.slides.map((slide, index) => (
            <button
              key={`${presentation.id}-${slide.index}`}
              type="button"
              onClick={() => setSelectedSlideIndex(index)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left transition",
                selectedSlideIndex === index
                  ? "border-primary bg-primary/10"
                  : "border-transparent hover:bg-muted",
              )}
            >
              <p className="text-xs text-muted-foreground">Slide {slide.index}</p>
              <p className="line-clamp-2 text-sm font-medium text-foreground">
                {slide.title}
              </p>
            </button>
          ))}
        </div>
      </aside>

      <div className="col-span-8 space-y-3">
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

        <article
          className={cn(
            "rounded-2xl border border-border p-6 shadow-sm",
            styleCardClasses[presentation.style],
          )}
        >
          <p className="text-xs uppercase tracking-wide opacity-80">
            {presentation.title}
          </p>
          <h3 className="mt-1 text-2xl font-semibold">{activeSlide.title}</h3>
          {activeSlide.subtitle ? (
            <p className="mt-2 text-base opacity-85">{activeSlide.subtitle}</p>
          ) : null}
          <div
            className="
              mt-5 max-w-none text-base leading-relaxed
              [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold
              [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold
              [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold
              [&_p]:my-3
              [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
              [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:my-1
              [&_strong]:font-semibold
            "
          >
            <Streamdown>{activeSlide.content_markdown}</Streamdown>
          </div>
        </article>
      </div>
    </section>
  );
}
