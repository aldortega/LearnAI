import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { useNotebook } from "../../notebooks/hooks/useNotebook";
import { DeleteReportModal } from "../components/DeleteReportModal";
import { EditReportPromptModal } from "../components/EditReportPromptModal";
import { ReportGenerationOverlay } from "../components/ReportGenerationOverlay";
import { ReportsHistoryList } from "../components/ReportsHistoryList";
import { ReportsShell } from "../components/ReportsShell";
import { ReportTemplatesGrid } from "../components/ReportTemplatesGrid";
import { ReportViewer } from "../components/ReportViewer";
import { useDeleteReport } from "../hooks/useDeleteReport";
import { useGenerateReport } from "../hooks/useGenerateReport";
import { useGenerateReportSuggestions } from "../hooks/useGenerateReportSuggestions";
import { useReportsConfig } from "../hooks/useReportsConfig";
import { hasCachedReports, useReportsHistory } from "../hooks/useReportsHistory";
import { useReportsNotebookSources } from "../hooks/useReportsNotebookSources";
import type { ReportFormatType, ReportOut, ReportPromptTemplate, ReportSuggestion } from "../types/reports.types";
type ReportViewMode = "templates" | "history";
type HistoryViewMode = "cards" | "detail";
type EditTarget = { title: string; formatType: ReportFormatType; suggestionId: string | null };
export function NotebookReportsPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const hasResolvedInitialViewRef = useRef(false);
  const hasTriggeredAutoSuggestionsRef = useRef(false);
  const previousReadySignatureRef = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<ReportViewMode>(() =>
    hasCachedReports(notebookId) ? "history" : "templates",
  );
  const [historyView, setHistoryView] = useState<HistoryViewMode>("cards");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [deleteReportTarget, setDeleteReportTarget] = useState<ReportOut | null>(null);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const {
    fileInputRef,
    documents,
    hasReadySources,
    readySignature,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useReportsNotebookSources(notebookId);
  const {
    config,
    isLoading: isConfigLoading,
    error: configError,
    reload: reloadConfig,
  } = useReportsConfig(notebookId);
  const {
    reports,
    isLoading: isReportsLoading,
    error: reportsError,
    reload: reloadReports,
    removeReport,
  } = useReportsHistory(notebookId);
  const {
    generate,
    isGenerating,
    error: generateError,
    clearError: clearGenerateError,
  } = useGenerateReport(notebookId);
  const {
    generate: generateSuggestions,
    isGenerating: isGeneratingSuggestions,
    error: generateSuggestionsError,
    clearError: clearGenerateSuggestionsError,
  } = useGenerateReportSuggestions(notebookId);
  const {
    deleteReport,
    deletingReportId,
    error: deleteReportError,
    clearError: clearDeleteReportError,
  } = useDeleteReport(notebookId);
  const templates = useMemo(() => (config?.templates ?? []).slice(0, 4), [config]);
  const suggestions = useMemo(() => (config?.suggestions ?? []).slice(0, 4), [config]);
  const hasConfigLoaded = Boolean(config);
  const canGenerateReports = config?.has_ready_sources ?? hasReadySources;
  const suggestionsStatus = config?.suggestions_status ?? "missing";
  const suggestionsAreStale = config?.suggestions_is_stale ?? false;
  const generationError = generateError ?? configError;
  const suggestionsError = generateSuggestionsError ?? config?.suggestions_error ?? null;
  const isSuggestionsLoading =
    isConfigLoading ||
    isRefreshingSuggestions ||
    isGeneratingSuggestions ||
    suggestionsStatus === "generating";
  useEffect(() => {
    hasResolvedInitialViewRef.current = false;
    hasTriggeredAutoSuggestionsRef.current = false;
    previousReadySignatureRef.current = null;
    setViewMode(hasCachedReports(notebookId) ? "history" : "templates");
    setHistoryView("cards");
    setEditTarget(null);
    setEditPrompt("");
    setSelectedReportId(null);
    setDeleteReportTarget(null);
    clearGenerateSuggestionsError();
  }, [notebookId, clearGenerateSuggestionsError]);
  useEffect(() => {
    hasTriggeredAutoSuggestionsRef.current = false;
  }, [notebookId, readySignature]);
  useEffect(() => {
    if (!notebookId) return;
    if (previousReadySignatureRef.current === null) {
      previousReadySignatureRef.current = readySignature;
      return;
    }
    if (previousReadySignatureRef.current === readySignature) return;

    previousReadySignatureRef.current = readySignature;
    void (async () => {
      await Promise.all([reloadConfig(), reloadReports()]);
    })();
  }, [notebookId, readySignature, reloadConfig, reloadReports]);
  useEffect(() => {
    if (!notebookId || !hasConfigLoaded) return;
    if (hasTriggeredAutoSuggestionsRef.current) return;
    if (isConfigLoading || isGeneratingSuggestions || !canGenerateReports) return;
    if (suggestionsStatus !== "missing" && !suggestionsAreStale) return;

    hasTriggeredAutoSuggestionsRef.current = true;
    void (async () => {
      clearGenerateSuggestionsError();
      await generateSuggestions();
      await reloadConfig();
    })();
  }, [
    notebookId,
    hasConfigLoaded,
    isConfigLoading,
    isGeneratingSuggestions,
    canGenerateReports,
    suggestionsStatus,
    suggestionsAreStale,
    clearGenerateSuggestionsError,
    generateSuggestions,
    reloadConfig,
  ]);
  useEffect(() => {
    if (!notebookId || isReportsLoading || hasResolvedInitialViewRef.current) return;
    hasResolvedInitialViewRef.current = true;
    if (reports.length === 0) {
      setViewMode("templates");
      return;
    }

    setViewMode("history");
    setHistoryView("cards");
    setSelectedReportId((prev) =>
      prev && reports.some((report) => report.id === prev) ? prev : reports[0].id,
    );
  }, [notebookId, isReportsLoading, reports]);
  const runGeneration = useCallback(
    async (formatType: ReportFormatType, prompt: string, suggestionId: string | null = null) => {
      if (!notebookId || !prompt.trim() || !canGenerateReports) return false;
      clearGenerateError();
      const result = await generate({
        format_type: formatType,
        prompt: prompt.trim(),
        suggestion_id: suggestionId ?? undefined,
      });
      if (!result) return false;
      const updatedReports = await reloadReports();
      if (result.report_id) {
        setSelectedReportId(result.report_id);
      } else if (updatedReports.length > 0) {
        setSelectedReportId(updatedReports[0].id);
      }
      setViewMode("history");
      setHistoryView("cards");
      setEditTarget(null);
      setEditPrompt("");
      return true;
    },
    [notebookId, canGenerateReports, clearGenerateError, generate, reloadReports],
  );
  const handleEditTemplate = useCallback(
    (template: ReportPromptTemplate) => {
      clearGenerateError();
      setEditTarget({
        title: template.label,
        formatType: template.type,
        suggestionId: null,
      });
      setEditPrompt(template.default_prompt);
    },
    [clearGenerateError],
  );
  const handleEditSuggestion = useCallback(
    (suggestion: ReportSuggestion) => {
      clearGenerateError();
      setEditTarget({
        title: suggestion.title,
        formatType: "ai_suggested",
        suggestionId: suggestion.id,
      });
      setEditPrompt(suggestion.default_prompt);
    },
    [clearGenerateError],
  );
  const handleGenerateTemplate = useCallback(
    (template: ReportPromptTemplate) => {
      if (template.type === "freeform") {
        handleEditTemplate(template);
        return;
      }
      void runGeneration(template.type, template.default_prompt, null);
    },
    [handleEditTemplate, runGeneration],
  );
  const handleGenerateSuggestion = useCallback(
    (suggestion: ReportSuggestion) => {
      void runGeneration("ai_suggested", suggestion.default_prompt, suggestion.id);
    },
    [runGeneration],
  );
  const handleRefreshSuggestions = useCallback(async () => {
    if (!notebookId || isRefreshingSuggestions || isGeneratingSuggestions) return;
    setIsRefreshingSuggestions(true);
    try {
      clearGenerateSuggestionsError();
      await generateSuggestions();
      await reloadConfig();
    } finally {
      setIsRefreshingSuggestions(false);
    }
  }, [
    notebookId,
    isRefreshingSuggestions,
    isGeneratingSuggestions,
    clearGenerateSuggestionsError,
    generateSuggestions,
    reloadConfig,
  ]);
  const handleRefreshSuggestionsClick = useCallback(() => {
    void handleRefreshSuggestions();
  }, [handleRefreshSuggestions]);
  const handleDeleteReportConfirm = useCallback(async () => {
    if (!deleteReportTarget) return;
    const deletedReportId = deleteReportTarget.id;
    const shouldReturnToCards = historyView === "detail";
    const deleted = await deleteReport(deletedReportId);
    if (!deleted) return;
    removeReport(deletedReportId);
    setDeleteReportTarget(null);
    const updatedReports = await reloadReports();
    if (updatedReports.length === 0) {
      setSelectedReportId(null);
      setHistoryView("cards");
      setViewMode("templates");
      return;
    }
    if (selectedReportId === deletedReportId) {
      setSelectedReportId(updatedReports[0].id);
    }
    if (shouldReturnToCards) {
      setHistoryView("cards");
    }
  }, [
    deleteReportTarget,
    historyView,
    deleteReport,
    removeReport,
    reloadReports,
    selectedReportId,
  ]);
  const handleDeleteDocumentCancel = useCallback(() => {
    setDeleteTarget(null);
  }, [setDeleteTarget]);
  const handleDeleteReportCancel = useCallback(() => {
    clearDeleteReportError();
    setDeleteReportTarget(null);
  }, [clearDeleteReportError]);
  const handleEditPromptCancel = useCallback(() => {
    if (isGenerating) return;
    setEditTarget(null);
    setEditPrompt("");
    clearGenerateError();
  }, [isGenerating, clearGenerateError]);
  const handleEditPromptGenerate = useCallback(() => {
    if (!editTarget) return;
    void runGeneration(editTarget.formatType, editPrompt, editTarget.suggestionId);
  }, [editTarget, editPrompt, runGeneration]);
  const handleSelectReport = useCallback((reportId: string) => {
    setSelectedReportId(reportId);
    setHistoryView("detail");
  }, []);
  const handleDeleteReport = useCallback(
    (report: ReportOut) => {
      clearDeleteReportError();
      setDeleteReportTarget(report);
    },
    [clearDeleteReportError],
  );
  const handleStudioNavChat = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/chat`);
  }, [notebookId, navigate]);
  const handleStudioNavQuiz = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quiz`);
  }, [notebookId, navigate]);
  const handleStudioNavQuickstart = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quickstart`);
  }, [notebookId, navigate]);
  const handleStudioNavReports = useCallback(() => undefined, []);
  const handleStudioNavMindmap = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/mindmap`);
  }, [notebookId, navigate]);
  const handleStudioNavFlashcards = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/flashcards`);
  }, [notebookId, navigate]);
  const activeReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );
  const canReturnToHistory = reports.length > 0;
  const isHeaderActionDisabled =
    viewMode === "history"
      ? historyView === "detail"
        ? false
        : isGenerating || !canGenerateReports
      : isGenerating || !canReturnToHistory;
  const headerActionLabel =
    viewMode === "history"
      ? historyView === "detail"
        ? "Ver lista de informes"
        : "Crear otro informe"
      : "Volver al historial";
  const handleHeaderAction = useCallback(() => {
    if (viewMode === "history" && historyView === "detail") {
      setHistoryView("cards");
      return;
    }
    if (viewMode === "history") {
      setViewMode("templates");
      clearGenerateError();
      return;
    }
    if (!canReturnToHistory) return;
    setViewMode("history");
    setHistoryView("cards");
    setSelectedReportId((prev) =>
      prev && reports.some((report) => report.id === prev) ? prev : reports[0].id,
    );
    clearGenerateError();
  }, [
    viewMode,
    historyView,
    canReturnToHistory,
    reports,
    clearGenerateError,
  ]);
  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={() => {
        if (!canManageDocuments) return;
        pickFile();
      }}
      onDeleteDocument={(document) => {
        if (!canManageDocuments) return;
        setDeleteTarget(document);
      }}
      mode="reports"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={isGenerating}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      onGoChat={handleStudioNavChat}
      onGoQuiz={handleStudioNavQuiz}
      onGoQuickstart={handleStudioNavQuickstart}
      onGoReports={handleStudioNavReports}
      onGoMindmap={handleStudioNavMindmap}
      onGoFlashcards={handleStudioNavFlashcards}
      beforeMain={
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.pptx"
          onChange={handleFileChange}
        />
      }
      footer={
        <>
          <DeleteDocumentModal
            isOpen={Boolean(deleteTarget)}
            documentName={deleteTarget?.file_name}
            isDeleting={deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false}
            onCancel={handleDeleteDocumentCancel}
            onConfirm={handleDeleteConfirm}
          />
          <DeleteReportModal
            isOpen={Boolean(deleteReportTarget)}
            reportTitle={deleteReportTarget?.title}
            isDeleting={deletingReportId === deleteReportTarget?.id}
            error={deleteReportError}
            onCancel={handleDeleteReportCancel}
            onConfirm={handleDeleteReportConfirm}
          />
          <EditReportPromptModal
            isOpen={Boolean(editTarget)}
            title={editTarget?.title ?? "Editar prompt"}
            prompt={editPrompt}
            isGenerating={isGenerating}
            error={generateError}
            onPromptChange={setEditPrompt}
            onCancel={handleEditPromptCancel}
            onGenerate={handleEditPromptGenerate}
          />
        </>
      }
    >
      <ReportsShell
        headerAction={
          <button
            type="button"
            onClick={handleHeaderAction}
            disabled={isHeaderActionDisabled}
            aria-label={headerActionLabel}
            title={headerActionLabel}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {viewMode === "history" ? historyView === "detail" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </button>
        }
      >
        <div className="relative h-full overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-6xl">
            {viewMode === "templates" ? (
              <div className="space-y-4">
                <ReportTemplatesGrid
                  templates={templates}
                  suggestions={suggestions}
                  disabled={!canGenerateReports || isGenerating}
                  isRefreshingSuggestions={isRefreshingSuggestions || isGeneratingSuggestions}
                  isSuggestionsLoading={isSuggestionsLoading}
                  isSuggestionsStale={suggestionsAreStale && suggestions.length > 0}
                  onGenerateTemplate={handleGenerateTemplate}
                  onGenerateSuggestion={handleGenerateSuggestion}
                  onEditTemplate={handleEditTemplate}
                  onEditSuggestion={handleEditSuggestion}
                  onRefreshSuggestions={handleRefreshSuggestionsClick}
                />
                {suggestionsError ? (
                  <p className="text-sm text-error" role="alert">
                    {suggestionsError}
                  </p>
                ) : null}
                {!canGenerateReports ? (
                  <p className="text-sm text-muted-foreground" role="alert">
                    Necesitas al menos una fuente lista para generar informes.
                  </p>
                ) : null}
                {generationError ? (
                  <p className="text-sm text-error" role="alert">
                    {generationError}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {reportsError ? (
                  <p className="text-sm text-error" role="alert">
                    {reportsError}
                  </p>
                ) : null}
                {historyView === "cards" ? (
                  <>
                    <ReportsHistoryList
                      reports={reports}
                      selectedReportId={activeReport?.id ?? null}
                      deletingReportId={deletingReportId}
                      onSelectReport={handleSelectReport}
                      onDeleteReport={handleDeleteReport}
                    />
                  </>
                ) : (
                  <ReportViewer
                    report={activeReport}
                    isLoading={false}
                    error={null}
                  />
                )}
              </div>
            )}
          </div>
          <ReportGenerationOverlay isVisible={isGenerating} />
        </div>
      </ReportsShell>
    </NotebookShell>
  );
}

