import { GeneratePresentationPanel } from "./GeneratePresentationPanel";
import { PresentationGenerationOverlay } from "./PresentationGenerationOverlay";
import { PresentationsHistoryList } from "./PresentationsHistoryList";
import { PresentationViewer } from "./PresentationViewer";
import type {
  PresentationDetailLevel,
  PresentationOut,
  PresentationStyle,
  PresentationStyleTemplate,
} from "../types/presentations.types";

type PresentationViewMode = "generate" | "history";
type HistoryViewMode = "cards" | "detail";

type Props = {
  viewMode: PresentationViewMode;
  historyView: HistoryViewMode;
  topic: string;
  styles: PresentationStyleTemplate[];
  selectedStyle: PresentationStyle;
  detailLevel: PresentationDetailLevel;
  canGeneratePresentations: boolean;
  isGenerating: boolean;
  isConfigLoading: boolean;
  generationError: string | null;
  presentations: PresentationOut[];
  deletingPresentationId: string | null;
  presentationsError: string | null;
  activePresentation: PresentationOut | null;
  selectedSlideIndex: number;
  isFirstSlide: boolean;
  isLastSlide: boolean;
  downloadPdfError: string | null;
  onTopicChange: (value: string) => void;
  onSelectStyle: (style: PresentationStyle) => void;
  onDetailLevelChange: (value: PresentationDetailLevel) => void;
  onGenerate: () => void;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
};

export function PresentationsContent({
  viewMode,
  historyView,
  topic,
  styles,
  selectedStyle,
  detailLevel,
  canGeneratePresentations,
  isGenerating,
  isConfigLoading,
  generationError,
  presentations,
  deletingPresentationId,
  presentationsError,
  activePresentation,
  selectedSlideIndex,
  isFirstSlide,
  isLastSlide,
  downloadPdfError,
  onTopicChange,
  onSelectStyle,
  onDetailLevelChange,
  onGenerate,
  onPreviousSlide,
  onNextSlide,
  onSelectPresentation,
  onDeletePresentation,
}: Props) {
  return (
    <div className="relative h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {viewMode === "generate" ? (
          <>
            <GeneratePresentationPanel
              topic={topic}
              styles={styles}
              selectedStyle={selectedStyle}
              detailLevel={detailLevel}
              disabled={!canGeneratePresentations || isGenerating || isConfigLoading}
              isGenerating={isGenerating}
              onTopicChange={onTopicChange}
              onSelectStyle={onSelectStyle}
              onDetailLevelChange={onDetailLevelChange}
              onGenerate={onGenerate}
            />
            {!canGeneratePresentations ? (
              <p className="text-sm text-muted-foreground" role="alert">
                Necesitas al menos una fuente lista para generar presentaciones.
              </p>
            ) : null}
            {generationError ? (
              <p className="text-sm text-error" role="alert">
                {generationError}
              </p>
            ) : null}
          </>
        ) : historyView === "cards" ? (
          <PresentationsHistoryList
            presentations={presentations}
            deletingPresentationId={deletingPresentationId}
            onSelectPresentation={onSelectPresentation}
            onDeletePresentation={onDeletePresentation}
          />
        ) : (
          <PresentationViewer
            key={activePresentation?.id ?? "none"}
            presentation={activePresentation}
            selectedSlideIndex={selectedSlideIndex}
            isFirstSlide={isFirstSlide}
            isLastSlide={isLastSlide}
            onPreviousSlide={onPreviousSlide}
            onNextSlide={onNextSlide}
            isLoading={false}
            error={presentationsError}
            downloadPdfError={downloadPdfError}
          />
        )}
      </div>
      <PresentationGenerationOverlay isVisible={isGenerating} />
    </div>
  );
}
