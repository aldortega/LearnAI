import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useNotebook } from "../../notebooks";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { PresentationsContent } from "../components/PresentationsContent";
import { PresentationsFooterModals } from "../components/PresentationsFooterModals";
import { PresentationsHeaderActions } from "../components/PresentationsHeaderActions";
import { PresentationsShell } from "../components/PresentationsShell";
import { useApplyPresentationSlide } from "../hooks/useApplyPresentationSlide";
import { useDeletePresentation } from "../hooks/useDeletePresentation";
import { useDownloadPresentationPdf } from "../hooks/useDownloadPresentationPdf";
import { useGeneratePresentation } from "../hooks/useGeneratePresentation";
import { useRegeneratePresentationSlide } from "../hooks/useRegeneratePresentationSlide";
import { usePresentationsHistory } from "../hooks/usePresentationsHistory";
import { usePresentationsConfig } from "../hooks/usePresentationsConfig";
import { usePresentationsNotebookSources } from "../hooks/usePresentationsNotebookSources";
import type {
  PresentationDetailLevel,
  PresentationGenerationMode,
  PresentationOut,
  PresentationSlide,
} from "../types/presentations.types";

type PresentationViewMode = "generate" | "history";
type HistoryViewMode = "cards" | "detail";

type Props = {
  routeMode?: "list" | "new";
};

export function NotebookPresentationsPage({ routeMode = "list" }: Props) {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const hasResolvedInitialViewRef = useRef(false);
  const previousReadySignatureRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<PresentationViewMode>(() =>
    routeMode === "new" ? "generate" : "history",
  );
  const [historyView, setHistoryView] = useState<HistoryViewMode>("cards");
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<PresentationOut | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editSlidePrompt, setEditSlidePrompt] = useState("");
  const [candidateSlide, setCandidateSlide] = useState<PresentationSlide | null>(null);
  const [candidatePresentationId, setCandidatePresentationId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [detailLevel, setDetailLevel] = useState<PresentationDetailLevel>("concise");
  const [generationMode, setGenerationMode] = useState<PresentationGenerationMode>("text");

  const {
    fileInputRef,
    documents,
    hasReadySources,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget: deleteDocumentTarget,
    setDeleteTarget: setDeleteDocumentTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = usePresentationsNotebookSources(notebookId);

  const { config, isLoading: isConfigLoading, error: configError, reload: reloadConfig } = usePresentationsConfig(notebookId);
  const {
    presentations,
    isLoading: isPresentationsLoading,
    hasResolved: hasResolvedPresentations,
    error: presentationsError,
    reload: reloadPresentations,
    removePresentation,
  } = usePresentationsHistory(notebookId);
  const { generate, resumeLatest, isGenerating, error: generateError, clearError: clearGenerateError } = useGeneratePresentation(notebookId);
  const { deletePresentation, deletingPresentationId, error: deleteError, clearError: clearDeleteError } = useDeletePresentation(notebookId);
  const {
    downloadPresentationPdf,
    downloadingPresentationId,
    error: downloadPdfError,
    clearError: clearDownloadPdfError,
  } = useDownloadPresentationPdf(notebookId);
  const {
    regenerateSlide,
    isRegenerating: isRegeneratingSlide,
    error: regenerateSlideError,
    clearError: clearRegenerateSlideError,
  } = useRegeneratePresentationSlide(notebookId);
  const {
    applySlide,
    isApplying: isApplyingSlide,
    error: applySlideError,
    clearError: clearApplySlideError,
  } = useApplyPresentationSlide(notebookId);

  const canGeneratePresentations = config?.has_ready_sources ?? hasReadySources;
  const generationError = generateError ?? configError;

  useEffect(() => {
    queueMicrotask(() => {
      hasCheckedLatestJobRef.current = false;
      hasResolvedInitialViewRef.current = false;
      previousReadySignatureRef.current = null;
      setViewMode(routeMode === "new" ? "generate" : "history");
      setHistoryView("cards");
      setSelectedPresentationId(null);
      setSelectedSlideIndex(0);
      setDeleteTarget(null);
      setIsEditPanelOpen(false);
      setEditSlidePrompt("");
      setCandidateSlide(null);
      setCandidatePresentationId(null);
      setTopic("");
      setDetailLevel("concise");
      setGenerationMode("text");
      clearGenerateError();
      clearRegenerateSlideError();
      clearApplySlideError();
    });
  }, [
    notebookId,
    clearApplySlideError,
    clearGenerateError,
    clearRegenerateSlideError,
    routeMode,
  ]);

  useEffect(() => {
    if (!notebookId) return;
    if (previousReadySignatureRef.current === null) {
      previousReadySignatureRef.current = readySignature;
      return;
    }
    if (previousReadySignatureRef.current === readySignature) return;
    previousReadySignatureRef.current = readySignature;
    void Promise.all([reloadConfig(), reloadPresentations()]);
  }, [notebookId, readySignature, reloadConfig, reloadPresentations]);

  useEffect(() => {
    if (!notebookId || hasCheckedLatestJobRef.current || isGenerating || isPresentationsLoading) return;
    if (routeMode === "new") return;
    hasCheckedLatestJobRef.current = true;
    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status !== "done") return;
      const updated = await reloadPresentations();
      if (!updated.length) return;
      setViewMode("history");
      setHistoryView("cards");
    })();
  }, [
    notebookId,
    isGenerating,
    isPresentationsLoading,
    reloadPresentations,
    resumeLatest,
    routeMode,
  ]);

  useEffect(() => {
    if (!notebookId || isPresentationsLoading || hasResolvedInitialViewRef.current) return;
    queueMicrotask(() => {
      hasResolvedInitialViewRef.current = true;

      if (routeMode === "new") {
        setViewMode("generate");
        return;
      }

      if (!presentations.length) {
        navigate(`/notebook/${notebookId}/presentations/new`, { replace: true });
        return;
      }
      setViewMode("history");
      setHistoryView("cards");
      setSelectedPresentationId(null);
      setSelectedSlideIndex(0);
    });
  }, [notebookId, isPresentationsLoading, presentations, routeMode, navigate]);

  const runGeneration = useCallback(async () => {
    if (!notebookId || !canGeneratePresentations || !topic.trim()) return;
    clearGenerateError();
    setViewMode("history");
    setHistoryView("cards");
    setSelectedPresentationId(null);
    setSelectedSlideIndex(0);
    const result = await generate({
      topic: topic.trim(),
      detail_level: detailLevel,
      generation_mode: generationMode,
    });
    if (!result) return;
    const updated = await reloadPresentations();
    if (!updated.length) return;
    if (routeMode === "new") {
      navigate(`/notebook/${notebookId}/presentations`, { replace: true });
    }
    setViewMode("history");
    setHistoryView("cards");
  }, [
    notebookId,
    canGeneratePresentations,
    topic,
    detailLevel,
    generationMode,
    clearGenerateError,
    generate,
    reloadPresentations,
    routeMode,
    navigate,
  ]);

  const activePresentation = useMemo(() => {
    if (!selectedPresentationId) return null;
    return presentations.find((item) => item.id === selectedPresentationId) ?? null;
  }, [presentations, selectedPresentationId]);
  const hasCoverSlide = activePresentation?.generation_mode !== "image";
  const slideCount = activePresentation
    ? activePresentation.slides.length + (hasCoverSlide ? 1 : 0)
    : 0;
  const maxSlideIndex = Math.max(0, slideCount - 1);
  const safeSlideIndex = Math.min(selectedSlideIndex, maxSlideIndex);
  const isFirstSlide = safeSlideIndex === 0;
  const isLastSlide = safeSlideIndex >= maxSlideIndex;
  const currentSlideContentIndex = hasCoverSlide ? safeSlideIndex - 1 : safeSlideIndex;
  const canEditCurrentSlide = Boolean(
    activePresentation &&
      currentSlideContentIndex >= 0 &&
      activePresentation.slides[currentSlideContentIndex]?.format === "markdown",
  );
  const candidateSlideForViewer = useMemo(() => {
    if (!candidateSlide || !candidatePresentationId || !activePresentation) return null;
    if (candidatePresentationId !== activePresentation.id) return null;
    return candidateSlide;
  }, [candidatePresentationId, candidateSlide, activePresentation]);
  const slideEditError = applySlideError ?? regenerateSlideError;

  const handlePreviousSlide = useCallback(() => {
    setSelectedSlideIndex(Math.max(0, safeSlideIndex - 1));
  }, [safeSlideIndex]);

  const handleNextSlide = useCallback(() => {
    setSelectedSlideIndex(Math.min(maxSlideIndex, safeSlideIndex + 1));
  }, [maxSlideIndex, safeSlideIndex]);

  const handleDeletePresentationConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const deletedId = deleteTarget.id;
    const deleted = await deletePresentation(deletedId);
    if (!deleted) return;
    removePresentation(deletedId);
    setDeleteTarget(null);
    const updated = await reloadPresentations();
    if (!updated.length) {
      setSelectedPresentationId(null);
      setHistoryView("cards");
      navigate(`/notebook/${notebookId}/presentations/new`, { replace: true });
      return;
    }
    if (selectedPresentationId === deletedId) {
      setSelectedPresentationId(updated[0].id);
      setSelectedSlideIndex(0);
      setHistoryView("cards");
    }
  }, [
    deleteTarget,
    deletePresentation,
    removePresentation,
    reloadPresentations,
    selectedPresentationId,
    notebookId,
    navigate,
  ]);

  const handleToggleView = useCallback(() => {
    if (viewMode === "history" && historyView === "detail") {
      setHistoryView("cards");
      return;
    }
    if (viewMode === "history") {
      if (!notebookId) return;
      navigate(`/notebook/${notebookId}/presentations/new`);
      return;
    }
    if (!presentations.length) return;
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/presentations`);
  }, [viewMode, historyView, presentations.length, notebookId, navigate]);

  const handleOpenEditSlide = useCallback(() => {
    if (!activePresentation || safeSlideIndex <= 0) return;
    clearApplySlideError();
    clearRegenerateSlideError();
    setIsEditPanelOpen((current) => {
      const next = !current;
      if (!next) {
        setEditSlidePrompt("");
      }
      return next;
    });
  }, [
    activePresentation,
    clearApplySlideError,
    clearRegenerateSlideError,
    safeSlideIndex,
  ]);

  const handleRegenerateSlide = useCallback(async () => {
    if (!activePresentation || safeSlideIndex <= 0) return;

    const regenerated = await regenerateSlide(
      activePresentation.id,
      safeSlideIndex,
      editSlidePrompt,
    );
    if (!regenerated) return;
    setCandidateSlide(regenerated);
    setCandidatePresentationId(activePresentation.id);
    setIsEditPanelOpen(false);
    setEditSlidePrompt("");
  }, [
    activePresentation,
    editSlidePrompt,
    regenerateSlide,
    safeSlideIndex,
  ]);

  const handleDiscardCandidateSlide = useCallback(() => {
    setCandidateSlide(null);
    setCandidatePresentationId(null);
    clearApplySlideError();
  }, [clearApplySlideError]);

  const handleApplyCandidateSlide = useCallback(async () => {
    if (!activePresentation || !candidateSlide || !candidatePresentationId) return;
    if (candidatePresentationId !== activePresentation.id) return;
    const appliedSlideIndex = candidateSlide.index;

    setCandidateSlide(null);
    setCandidatePresentationId(null);
    clearApplySlideError();

    const applied = await applySlide(
      activePresentation.id,
      appliedSlideIndex,
      candidateSlide,
    );
    if (!applied) {
      setCandidateSlide(candidateSlide);
      setCandidatePresentationId(activePresentation.id);
      return;
    }

    const updated = await reloadPresentations();
    if (!updated.length) return;
    setSelectedPresentationId((current) =>
      current && updated.some((item) => item.id === current) ? current : updated[0].id,
    );
    setSelectedSlideIndex(appliedSlideIndex);
    clearApplySlideError();
  }, [
    activePresentation,
    applySlide,
    candidatePresentationId,
    candidateSlide,
    reloadPresentations,
    clearApplySlideError,
  ]);

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isNotebookLoading={isNotebookLoading}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={() => canManageDocuments && pickFile()}
      onDeleteDocument={(document) => canManageDocuments && setDeleteDocumentTarget(document)}
      mode="presentations"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartPresentations={hasReadySources}
      isGeneratingPresentations={isGenerating}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      onGoChat={() => notebookId && navigate(`/notebook/${notebookId}/chat`)}
      onGoQuiz={() => notebookId && navigate(`/notebook/${notebookId}/quiz`)}
      onGoQuickstart={() => notebookId && navigate(`/notebook/${notebookId}/quickstart`)}
      onGoReports={() => notebookId && navigate(`/notebook/${notebookId}/reports`)}
      onGoPresentations={() => notebookId && navigate(`/notebook/${notebookId}/presentations`)}
      onGoMindmap={() => notebookId && navigate(`/notebook/${notebookId}/mindmap`)}
      onGoFlashcards={() => notebookId && navigate(`/notebook/${notebookId}/flashcards`)}
      beforeMain={<input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,.pptx" onChange={handleFileChange} />}
      footer={
        <PresentationsFooterModals
          deleteDocumentTarget={deleteDocumentTarget}
          deletingDocumentIds={deletingDocumentIds}
          onCancelDocumentDelete={() => setDeleteDocumentTarget(null)}
          onConfirmDocumentDelete={handleDeleteConfirm}
          deletePresentationTarget={deleteTarget}
          deletingPresentationId={deletingPresentationId}
          deleteError={deleteError}
          onCancelPresentationDelete={() => {
            clearDeleteError();
            setDeleteTarget(null);
          }}
          onConfirmPresentationDelete={handleDeletePresentationConfirm}
        />
      }
    >
      <PresentationsShell
        headerAction={
          <PresentationsHeaderActions
            viewMode={viewMode}
            historyView={historyView}
            presentationsCount={presentations.length}
            activePresentation={activePresentation}
            downloadingPresentationId={downloadingPresentationId}
            isFirstSlide={isFirstSlide}
            isLastSlide={isLastSlide}
            onPreviousSlide={handlePreviousSlide}
            onNextSlide={handleNextSlide}
            onDownloadPdf={() => {
              if (!activePresentation) return;
              clearDownloadPdfError();
              void downloadPresentationPdf(activePresentation.id);
            }}
            onEditSlide={handleOpenEditSlide}
            canEditSlide={canEditCurrentSlide}
            isEditingSlide={isRegeneratingSlide}
            onToggleView={handleToggleView}
          />
        }
      >
        <PresentationsContent
          viewMode={viewMode}
          historyView={historyView}
          topic={topic}
          detailLevel={detailLevel}
          generationMode={generationMode}
          canGeneratePresentations={canGeneratePresentations}
          isGenerating={isGenerating}
          isPresentationsLoading={isPresentationsLoading}
          hasResolvedPresentations={hasResolvedPresentations}
          isConfigLoading={isConfigLoading}
          generationError={generationError}
          presentations={presentations}
          deletingPresentationId={deletingPresentationId}
          presentationsError={presentationsError}
          activePresentation={activePresentation}
          selectedSlideIndex={safeSlideIndex}
          isFirstSlide={isFirstSlide}
          isLastSlide={isLastSlide}
          downloadPdfError={downloadPdfError}
          candidateSlide={candidateSlideForViewer}
          candidateSlideError={slideEditError}
          isApplyingSlide={isApplyingSlide}
          isEditPanelOpen={isEditPanelOpen}
          canEditCurrentSlide={canEditCurrentSlide}
          editPrompt={editSlidePrompt}
          isRegeneratingSlide={isRegeneratingSlide}
          onTopicChange={setTopic}
          onDetailLevelChange={setDetailLevel}
          onGenerationModeChange={setGenerationMode}
          onGenerate={() => void runGeneration()}
          onPreviousSlide={handlePreviousSlide}
          onNextSlide={handleNextSlide}
          onSelectPresentation={(presentationId) => {
            setSelectedPresentationId(presentationId);
            setSelectedSlideIndex(0);
            setHistoryView("detail");
          }}
          onDeletePresentation={(presentation) => {
            clearDeleteError();
            setDeleteTarget(presentation);
          }}
          onApplyCandidateSlide={() => void handleApplyCandidateSlide()}
          onDiscardCandidateSlide={handleDiscardCandidateSlide}
          onEditPromptChange={setEditSlidePrompt}
          onRegenerateSlide={() => void handleRegenerateSlide()}
        />
      </PresentationsShell>
    </NotebookShell>
  );
}
