import { ChevronLeft, ChevronRight, Download, LoaderCircle, Plus, Presentation } from "lucide-react";

import type { PresentationOut } from "../types/presentations.types";

type PresentationViewMode = "generate" | "history";
type HistoryViewMode = "cards" | "detail";

type Props = {
  viewMode: PresentationViewMode;
  historyView: HistoryViewMode;
  presentationsCount: number;
  activePresentation: PresentationOut | null;
  downloadingPresentationId: string | null;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  onDownloadPdf: () => void;
  onToggleView: () => void;
};

export function PresentationsHeaderActions({
  viewMode,
  historyView,
  presentationsCount,
  activePresentation,
  downloadingPresentationId,
  isFirstSlide,
  isLastSlide,
  onPreviousSlide,
  onNextSlide,
  onDownloadPdf,
  onToggleView,
}: Props) {
  const isDownloading = downloadingPresentationId === activePresentation?.id;
  const disableToggle = viewMode === "generate" && presentationsCount === 0;

  return (
    <div className="inline-flex items-center gap-1">
      {viewMode === "history" && historyView === "detail" ? (
        <>
          <button
            type="button"
            onClick={onPreviousSlide}
            disabled={!activePresentation || isFirstSlide}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            title="Slide anterior"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextSlide}
            disabled={!activePresentation || isLastSlide}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            title="Slide siguiente"
            aria-label="Slide siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      ) : null}
      {viewMode === "history" && historyView === "detail" ? (
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={!activePresentation || isDownloading}
          className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          title="Descargar PDF"
        >
          {isDownloading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onToggleView}
        disabled={disableToggle}
        className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        title="Cambiar vista"
      >
        {viewMode === "history" ? (
          historyView === "detail" ? (
            <Presentation className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )
        ) : (
          <Presentation className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
