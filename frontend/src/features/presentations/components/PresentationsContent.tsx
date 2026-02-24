import { GeneratePresentationPanel } from "./GeneratePresentationPanel";
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
  if (viewMode === "generate") {
    return (
      <div className="relative h-full">
        <GeneratePresentationPanel
          topic={topic}
          styles={styles}
          selectedStyle={selectedStyle}
          detailLevel={detailLevel}
          disabled={!canGeneratePresentations || isGenerating || isConfigLoading}
          isGenerating={isGenerating}
          canGenerate={canGeneratePresentations}
          error={generationError}
          onTopicChange={onTopicChange}
          onSelectStyle={onSelectStyle}
          onDetailLevelChange={onDetailLevelChange}
          onGenerate={onGenerate}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        {historyView === "cards" ? (
          <PresentationsHistoryList
            presentations={presentations}
            isGenerating={isGenerating}
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
    </div>
  );
}
