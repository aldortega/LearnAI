import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useNotebook } from "../../notebooks";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { PresentationsContent } from "../components/PresentationsContent";
import { PresentationsFooterModals } from "../components/PresentationsFooterModals";
import { PresentationsHeaderActions } from "../components/PresentationsHeaderActions";
import { PresentationsShell } from "../components/PresentationsShell";
import { useDeletePresentation } from "../hooks/useDeletePresentation";
import { useDownloadPresentationPdf } from "../hooks/useDownloadPresentationPdf";
import { useGeneratePresentation } from "../hooks/useGeneratePresentation";
import { hasCachedPresentations, usePresentationsHistory } from "../hooks/usePresentationsHistory";
import { usePresentationsConfig } from "../hooks/usePresentationsConfig";
import { usePresentationsNotebookSources } from "../hooks/usePresentationsNotebookSources";
import type { PresentationDetailLevel, PresentationOut, PresentationStyle } from "../types/presentations.types";

type PresentationViewMode = "generate" | "history";
type HistoryViewMode = "cards" | "detail";

export function NotebookPresentationsPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasCheckedLatestJobRef = useRef(false);
  const hasResolvedInitialViewRef = useRef(false);
  const previousReadySignatureRef = useRef<string | null>(null);

  const [viewMode, setViewMode] = useState<PresentationViewMode>(() => hasCachedPresentations(notebookId) ? "history" : "generate");
  const [historyView, setHistoryView] = useState<HistoryViewMode>("cards");
  const [selectedPresentationId, setSelectedPresentationId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PresentationOut | null>(null);
  const [topic, setTopic] = useState("");
  const [detailLevel, setDetailLevel] = useState<PresentationDetailLevel>("concise");
  const [selectedStyle, setSelectedStyle] = useState<PresentationStyle>("clean");

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
  const { presentations, isLoading: isPresentationsLoading, error: presentationsError, reload: reloadPresentations, removePresentation } =
    usePresentationsHistory(notebookId);
  const { generate, resumeLatest, isGenerating, error: generateError, clearError: clearGenerateError } = useGeneratePresentation(notebookId);
  const { deletePresentation, deletingPresentationId, error: deleteError, clearError: clearDeleteError } = useDeletePresentation(notebookId);
  const {
    downloadPresentationPdf,
    downloadingPresentationId,
    error: downloadPdfError,
    clearError: clearDownloadPdfError,
  } = useDownloadPresentationPdf(notebookId);

  const canGeneratePresentations = config?.has_ready_sources ?? hasReadySources;
  const styleOptions = useMemo(() => config?.styles ?? [], [config]);
  const generationError = generateError ?? configError;

  useEffect(() => {
    queueMicrotask(() => {
      hasCheckedLatestJobRef.current = false;
      hasResolvedInitialViewRef.current = false;
      previousReadySignatureRef.current = null;
      setViewMode(hasCachedPresentations(notebookId) ? "history" : "generate");
      setHistoryView("cards");
      setSelectedPresentationId(null);
      setDeleteTarget(null);
      setTopic("");
      setDetailLevel("concise");
      clearGenerateError();
    });
  }, [notebookId, clearGenerateError]);

  useEffect(() => {
    if (!styleOptions.length || styleOptions.some((item) => item.style === selectedStyle)) return;
    queueMicrotask(() => {
      setSelectedStyle(styleOptions[0].style);
    });
  }, [selectedStyle, styleOptions]);

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
    hasCheckedLatestJobRef.current = true;
    void (async () => {
      const result = await resumeLatest({ suppressFailedError: true });
      if (result?.status !== "done") return;
      const updated = await reloadPresentations();
      const nextId = result.presentation_id ?? updated[0]?.id ?? null;
      if (!nextId) return;
      setSelectedPresentationId(nextId);
      setViewMode("history");
      setHistoryView("detail");
    })();
  }, [notebookId, isGenerating, isPresentationsLoading, reloadPresentations, resumeLatest]);

  useEffect(() => {
    if (!notebookId || isPresentationsLoading || hasResolvedInitialViewRef.current) return;
    queueMicrotask(() => {
      hasResolvedInitialViewRef.current = true;
      if (!presentations.length) {
        setViewMode("generate");
        return;
      }
      setViewMode("history");
      setHistoryView("cards");
      setSelectedPresentationId(presentations[0].id);
    });
  }, [notebookId, isPresentationsLoading, presentations]);

  const runGeneration = useCallback(async () => {
    if (!notebookId || !canGeneratePresentations || !topic.trim()) return;
    clearGenerateError();
    const result = await generate({ topic: topic.trim(), style: selectedStyle, detail_level: detailLevel });
    if (!result) return;
    const updated = await reloadPresentations();
    const nextId = result.presentation_id ?? updated[0]?.id ?? null;
    if (!nextId) return;
    setSelectedPresentationId(nextId);
    setViewMode("history");
    setHistoryView("detail");
  }, [notebookId, canGeneratePresentations, topic, selectedStyle, detailLevel, clearGenerateError, generate, reloadPresentations]);

  const activePresentation = useMemo(() => {
    if (!selectedPresentationId) return null;
    return presentations.find((item) => item.id === selectedPresentationId) ?? null;
  }, [presentations, selectedPresentationId]);

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
      setViewMode("generate");
      return;
    }
    if (selectedPresentationId === deletedId) {
      setSelectedPresentationId(updated[0].id);
      setHistoryView("cards");
    }
  }, [deleteTarget, deletePresentation, removePresentation, reloadPresentations, selectedPresentationId]);

  const handleToggleView = useCallback(() => {
    if (viewMode === "history" && historyView === "detail") {
      setHistoryView("cards");
      return;
    }
    if (viewMode === "history") {
      setViewMode("generate");
      return;
    }
    if (!presentations.length) return;
    setViewMode("history");
    setHistoryView("cards");
  }, [viewMode, historyView, presentations.length]);

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
      onGoPresentations={() => undefined}
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
            onDownloadPdf={() => {
              if (!activePresentation) return;
              clearDownloadPdfError();
              void downloadPresentationPdf(activePresentation.id);
            }}
            onToggleView={handleToggleView}
          />
        }
      >
        <PresentationsContent
          viewMode={viewMode}
          historyView={historyView}
          topic={topic}
          styles={styleOptions}
          selectedStyle={selectedStyle}
          detailLevel={detailLevel}
          canGeneratePresentations={canGeneratePresentations}
          isGenerating={isGenerating}
          isConfigLoading={isConfigLoading}
          generationError={generationError}
          presentations={presentations}
          selectedPresentationId={selectedPresentationId}
          deletingPresentationId={deletingPresentationId}
          presentationsError={presentationsError}
          activePresentation={activePresentation}
          downloadPdfError={downloadPdfError}
          onTopicChange={setTopic}
          onSelectStyle={setSelectedStyle}
          onDetailLevelChange={setDetailLevel}
          onGenerate={() => void runGeneration()}
          onSelectPresentation={(presentationId) => {
            setSelectedPresentationId(presentationId);
            setHistoryView("detail");
          }}
          onDeletePresentation={(presentation) => {
            clearDeleteError();
            setDeleteTarget(presentation);
          }}
        />
      </PresentationsShell>
    </NotebookShell>
  );
}
