import { GeneratePresentationPanel } from "./GeneratePresentationPanel";
import { PresentationsHistoryList } from "./PresentationsHistoryList";
import { PresentationViewer } from "./PresentationViewer";
import type {
  PresentationDetailLevel,
  PresentationOut,
  PresentationSlide,
} from "../types/presentations.types";

type PresentationViewMode = "generate" | "history";
type HistoryViewMode = "cards" | "detail";

type Props = {
  viewMode: PresentationViewMode;
  historyView: HistoryViewMode;
  topic: string;
  detailLevel: PresentationDetailLevel;
  canGeneratePresentations: boolean;
  isGenerating: boolean;
  isPresentationsLoading: boolean;
  hasResolvedPresentations: boolean;
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
  candidateSlide: PresentationSlide | null;
  candidateSlideError: string | null;
  isApplyingSlide: boolean;
  isEditPanelOpen: boolean;
  canEditCurrentSlide: boolean;
  editPrompt: string;
  isRegeneratingSlide: boolean;
  onTopicChange: (value: string) => void;
  onDetailLevelChange: (value: PresentationDetailLevel) => void;
  onGenerate: () => void;
  onPreviousSlide: () => void;
  onNextSlide: () => void;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
  onApplyCandidateSlide: () => void;
  onDiscardCandidateSlide: () => void;
  onEditPromptChange: (value: string) => void;
  onRegenerateSlide: () => void;
};

export function PresentationsContent({
  viewMode,
  historyView,
  topic,
  detailLevel,
  canGeneratePresentations,
  isGenerating,
  isPresentationsLoading,
  hasResolvedPresentations,
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
  candidateSlide,
  candidateSlideError,
  isApplyingSlide,
  isEditPanelOpen,
  canEditCurrentSlide,
  editPrompt,
  isRegeneratingSlide,
  onTopicChange,
  onDetailLevelChange,
  onGenerate,
  onPreviousSlide,
  onNextSlide,
  onSelectPresentation,
  onDeletePresentation,
  onApplyCandidateSlide,
  onDiscardCandidateSlide,
  onEditPromptChange,
  onRegenerateSlide,
}: Props) {
  const containerClassName =
    historyView === "detail"
      ? "relative h-full overflow-hidden p-6"
      : "relative h-full overflow-y-auto p-6";
  const contentClassName =
    historyView === "detail"
      ? "mx-auto flex h-full w-full max-w-5xl min-h-0 flex-col gap-3"
      : "mx-auto w-full max-w-5xl space-y-4";

  if (viewMode === "generate") {
    return (
      <div className="relative h-full">
        <GeneratePresentationPanel
          topic={topic}
          detailLevel={detailLevel}
          disabled={!canGeneratePresentations || isGenerating || isConfigLoading}
          isGenerating={isGenerating}
          canGenerate={canGeneratePresentations}
          error={generationError}
          onTopicChange={onTopicChange}
          onDetailLevelChange={onDetailLevelChange}
          onGenerate={onGenerate}
        />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className={contentClassName}>
        {historyView === "cards" ? (
          <PresentationsHistoryList
            presentations={presentations}
            isLoading={isPresentationsLoading}
            hasResolved={hasResolvedPresentations}
            isGenerating={isGenerating}
            deletingPresentationId={deletingPresentationId}
            onSelectPresentation={onSelectPresentation}
            onDeletePresentation={onDeletePresentation}
          />
        ) : (
          <div className="min-h-0 flex-1">
            <div className="min-w-0 flex-1">
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
                candidateSlide={candidateSlide}
                candidateSlideError={candidateSlideError}
                isRegeneratingSlide={isRegeneratingSlide}
                isApplyingSlide={isApplyingSlide}
                isEditPanelOpen={isEditPanelOpen}
                canEditCurrentSlide={canEditCurrentSlide}
                editPrompt={editPrompt}
                onApplyCandidateSlide={onApplyCandidateSlide}
                onDiscardCandidateSlide={onDiscardCandidateSlide}
                onEditPromptChange={onEditPromptChange}
                onRegenerateSlide={onRegenerateSlide}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
