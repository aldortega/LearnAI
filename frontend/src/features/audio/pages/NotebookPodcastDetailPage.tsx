import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";

import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { useNotebook } from "../../notebooks/hooks/useNotebook";
import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";
import { AudioShell } from "../components/AudioShell";
import { DeletePodcastModal } from "../components/DeletePodcastModal";
import { PodcastDetail } from "../components/PodcastDetail";
import { useAudioStudioNav } from "../hooks/useAudioStudioNav";
import { useDeletePodcast } from "../hooks/useDeletePodcast";
import { usePodcastDetail } from "../hooks/usePodcastDetail";

export function NotebookPodcastDetailPage() {
  const { notebookId, podcastId } = useParams();
  const navigate = useNavigate();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;
  const nav = useAudioStudioNav(notebookId);
  const sources = useNotebookStudioSources(notebookId);
  const { podcast, isLoading, error } = usePodcastDetail(notebookId, podcastId);
  const {
    deletePodcast,
    deletingPodcastId,
    error: deletePodcastError,
    clearError: clearDeleteError,
  } = useDeletePodcast(notebookId);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleBack = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/audio`);
  }, [notebookId, navigate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!podcastId) return;
    const deleted = await deletePodcast(podcastId);
    if (!deleted) return;
    setIsDeleteOpen(false);
    if (notebookId) {
      navigate(`/notebook/${notebookId}/audio`, { replace: true });
    }
  }, [podcastId, notebookId, deletePodcast, navigate]);

  const headerAction = (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => {
          clearDeleteError();
          setIsDeleteOpen(true);
        }}
        disabled={!podcast || deletingPodcastId === podcast?.id}
        aria-label="Eliminar podcast"
        title="Eliminar podcast"
        className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleBack}
        aria-label="Volver al historial"
        title="Volver al historial"
        className="inline-flex items-center justify-center rounded-md p-1.5 text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <NotebookShell
      title={notebook?.title}
      documents={sources.documents}
      canManageDocuments={canManageDocuments}
      isNotebookLoading={isNotebookLoading}
      isUploading={sources.isUploading}
      deletingDocumentIds={sources.deletingDocumentIds}
      onAddSource={() => {
        if (!canManageDocuments) return;
        sources.pickFile();
      }}
      onDeleteDocument={(document) => {
        if (!canManageDocuments) return;
        sources.setDeleteTarget(document);
      }}
      mode="audio"
      isStudioLocked={false}
      canStartQuiz={sources.hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={sources.hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={sources.hasReadySources}
      isGeneratingReports={false}
      canStartPresentations={sources.hasReadySources}
      isGeneratingPresentations={false}
      canStartMindmap={sources.hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={sources.hasReadySources}
      isGeneratingFlashcards={false}
      canStartAudio={sources.hasReadySources}
      isGeneratingAudio={false}
      onGoChat={nav.goChat}
      onGoQuiz={nav.goQuiz}
      onGoQuickstart={nav.goQuickstart}
      onGoReports={nav.goReports}
      onGoPresentations={nav.goPresentations}
      onGoMindmap={nav.goMindmap}
      onGoFlashcards={nav.goFlashcards}
      onGoAudio={nav.goAudio}
      beforeMain={
        <input
          ref={sources.fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.pptx"
          onChange={sources.handleFileChange}
        />
      }
      footer={
        <>
          <DeleteDocumentModal
            isOpen={Boolean(sources.deleteTarget)}
            documentName={sources.deleteTarget?.file_name}
            isDeleting={
              sources.deleteTarget
                ? sources.deletingDocumentIds.has(sources.deleteTarget.id)
                : false
            }
            onCancel={() => sources.setDeleteTarget(null)}
            onConfirm={sources.handleDeleteConfirm}
          />
          <DeletePodcastModal
            isOpen={isDeleteOpen}
            podcastTitle={podcast?.title}
            isDeleting={Boolean(podcast) && deletingPodcastId === podcast?.id}
            error={deletePodcastError}
            onCancel={() => {
              clearDeleteError();
              setIsDeleteOpen(false);
            }}
            onConfirm={handleDeleteConfirm}
          />
        </>
      }
    >
      <AudioShell headerAction={headerAction}>
        <div className="h-full overflow-y-auto p-6">
          <div className="mx-auto w-full max-w-4xl">
            <PodcastDetail podcast={podcast} isLoading={isLoading} error={error} />
          </div>
        </div>
      </AudioShell>
    </NotebookShell>
  );
}
