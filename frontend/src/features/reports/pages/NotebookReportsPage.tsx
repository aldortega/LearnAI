import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../../shared/ui/Button";
import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { useNotebook } from "../../notebooks";
import { DeleteReportModal } from "../components/DeleteReportModal";
import { EditReportPromptModal } from "../components/EditReportPromptModal";
import { ReportGenerationOverlay } from "../components/ReportGenerationOverlay";
import { ReportsHistoryList } from "../components/ReportsHistoryList";
import { ReportsShell } from "../components/ReportsShell";
import { ReportTemplatesGrid } from "../components/ReportTemplatesGrid";
import { ReportViewer } from "../components/ReportViewer";
import { useDeleteReport } from "../hooks/useDeleteReport";
import { useGenerateReport } from "../hooks/useGenerateReport";
import { useReportsConfig } from "../hooks/useReportsConfig";
import { useReportsHistory } from "../hooks/useReportsHistory";
import { useReportsNotebookSources } from "../hooks/useReportsNotebookSources";
import type { ReportFormatType, ReportOut, ReportPromptTemplate, ReportSuggestion } from "../types/reports.types";
type ReportViewMode = "templates" | "history";
type EditTarget = { title: string; formatType: ReportFormatType; suggestionId: string | null };
export function NotebookReportsPage() {
  const { notebookId } = useParams();
  const navigate = useNavigate();
  const { notebook } = useNotebook(notebookId);
  const hasResolvedInitialViewRef = useRef(false);
  const [viewMode, setViewMode] = useState<ReportViewMode>("templates");
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [deleteReportTarget, setDeleteReportTarget] = useState<ReportOut | null>(null);
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
  const { config, error: configError, reload: reloadConfig } = useReportsConfig(notebookId);
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
    deleteReport,
    deletingReportId,
    error: deleteReportError,
    clearError: clearDeleteReportError,
  } = useDeleteReport(notebookId);
  const templates = (config?.templates ?? []).slice(0, 4);
  const suggestions = (config?.suggestions ?? []).slice(0, 4);
  const canGenerateReports = config?.has_ready_sources ?? hasReadySources;
  const generationError = generateError ?? configError;
  useEffect(() => {
    queueMicrotask(() => {
      hasResolvedInitialViewRef.current = false;
      setViewMode("templates");
      setEditTarget(null);
      setEditPrompt("");
      setSelectedReportId(null);
      setDeleteReportTarget(null);
    });
  }, [notebookId]);
  useEffect(() => {
    if (!notebookId) return;
    void (async () => {
      await reloadConfig();
      await reloadReports();
    })();
  }, [notebookId, readySignature, reloadConfig, reloadReports]);
  useEffect(() => {
    if (!notebookId || isReportsLoading || hasResolvedInitialViewRef.current) return;
    hasResolvedInitialViewRef.current = true;
    queueMicrotask(() => {
      if (reports.length === 0) return setViewMode("templates");
      setViewMode("history");
      setSelectedReportId((prev) =>
        prev && reports.some((report) => report.id === prev) ? prev : reports[0].id,
      );
    });
  }, [notebookId, isReportsLoading, reports]);
  const runGeneration = async (formatType: ReportFormatType, prompt: string, suggestionId: string | null = null) => {
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
    setEditTarget(null);
    setEditPrompt("");
    return true;
  };
  const handleGenerateTemplate = (template: ReportPromptTemplate) => {
    void runGeneration(template.type, template.default_prompt, null);
  };
  const handleGenerateSuggestion = (suggestion: ReportSuggestion) => {
    void runGeneration("ai_suggested", suggestion.default_prompt, suggestion.id);
  };
  const handleEditTemplate = (template: ReportPromptTemplate) => {
    clearGenerateError();
    setEditTarget({ title: template.label, formatType: template.type, suggestionId: null });
    setEditPrompt(template.default_prompt);
  };
  const handleEditSuggestion = (suggestion: ReportSuggestion) => {
    clearGenerateError();
    setEditTarget({ title: suggestion.title, formatType: "ai_suggested", suggestionId: suggestion.id });
    setEditPrompt(suggestion.default_prompt);
  };
  const handleDeleteReportConfirm = async () => {
    if (!deleteReportTarget) return;
    const deleted = await deleteReport(deleteReportTarget.id);
    if (!deleted) return;
    removeReport(deleteReportTarget.id);
    if (selectedReportId === deleteReportTarget.id) {
      setSelectedReportId(null);
    }
    setDeleteReportTarget(null);
    await reloadReports();
  };
  const activeReport = reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null;
  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      isUploading={isUploading}
      deletingDocumentIds={deletingDocumentIds}
      onAddSource={pickFile}
      onDeleteDocument={setDeleteTarget}
      mode="reports"
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={isGenerating}
      onGoChat={() => notebookId && navigate(`/notebook/${notebookId}/chat`)}
      onGoQuiz={() => notebookId && navigate(`/notebook/${notebookId}/quiz`)}
      onGoQuickstart={() => notebookId && navigate(`/notebook/${notebookId}/quickstart`)}
      onGoReports={() => {}}
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
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
          />
          <DeleteReportModal
            isOpen={Boolean(deleteReportTarget)}
            reportTitle={deleteReportTarget?.title}
            isDeleting={deletingReportId === deleteReportTarget?.id}
            error={deleteReportError}
            onCancel={() => {
              clearDeleteReportError();
              setDeleteReportTarget(null);
            }}
            onConfirm={handleDeleteReportConfirm}
          />
          <EditReportPromptModal
            isOpen={Boolean(editTarget)}
            title={editTarget?.title ?? "Editar prompt"}
            prompt={editPrompt}
            isGenerating={isGenerating}
            error={generateError}
            onPromptChange={setEditPrompt}
            onCancel={() => {
              if (isGenerating) return;
              setEditTarget(null);
              setEditPrompt("");
              clearGenerateError();
            }}
            onGenerate={() => {
              if (!editTarget) return;
              void runGeneration(
                editTarget.formatType,
                editPrompt,
                editTarget.suggestionId,
              );
            }}
          />
        </>
      }
    >
      <ReportsShell>
        <div className="relative h-full overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-6xl">
            {viewMode === "templates" ? (
              <div className="space-y-4">
                <ReportTemplatesGrid
                  templates={templates}
                  suggestions={suggestions}
                  disabled={!canGenerateReports || isGenerating}
                  onGenerateTemplate={handleGenerateTemplate}
                  onGenerateSuggestion={handleGenerateSuggestion}
                  onEditTemplate={handleEditTemplate}
                  onEditSuggestion={handleEditSuggestion}
                />
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
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Informes generados
                  </h3>
                  <Button
                    className="px-4 py-2"
                    onClick={() => {
                      setViewMode("templates");
                      clearGenerateError();
                    }}
                    disabled={isGenerating}
                  >
                    Crear otro informe
                  </Button>
                </div>
                {reportsError ? (
                  <p className="text-sm text-error" role="alert">
                    {reportsError}
                  </p>
                ) : null}
                <ReportsHistoryList
                  reports={reports}
                  selectedReportId={activeReport?.id ?? null}
                  deletingReportId={deletingReportId}
                  onSelectReport={setSelectedReportId}
                  onDeleteReport={(report) => {
                    clearDeleteReportError();
                    setDeleteReportTarget(report);
                  }}
                />
                <ReportViewer report={activeReport} isLoading={false} error={null} />
              </div>
            )}
          </div>
          <ReportGenerationOverlay isVisible={isGenerating} />
        </div>
      </ReportsShell>
    </NotebookShell>
  );
}
