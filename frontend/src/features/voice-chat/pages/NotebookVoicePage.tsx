import { useParams } from "react-router-dom";

import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import { NotebookShell } from "../../notebooks/components/NotebookShell";
import { useNotebook } from "../../notebooks/hooks/useNotebook";
import { useNotebookStudioSources } from "../../notebooks/hooks/useNotebookStudioSources";
import { VoiceCallShell } from "../components/VoiceCallShell";
import { VoiceControls } from "../components/VoiceControls";
import { VoiceStatusOrb } from "../components/VoiceStatusOrb";
import { useGeminiLiveSession } from "../hooks/useGeminiLiveSession";
import { useVoiceStudioNav } from "../hooks/useVoiceStudioNav";

export function NotebookVoicePage() {
  const { notebookId } = useParams();
  const { notebook, isLoading: isNotebookLoading } = useNotebook(notebookId);
  const canManageDocuments = notebook?.can_manage_documents ?? false;

  const nav = useVoiceStudioNav(notebookId);
  const {
    fileInputRef,
    documents,
    hasReadySources,
    isUploading,
    deletingDocumentIds,
    deleteTarget,
    setDeleteTarget,
    handleFileChange,
    handleDeleteConfirm,
    pickFile,
  } = useNotebookStudioSources(notebookId);

  const { phase, error, muted, start, toggleMute, end } =
    useGeminiLiveSession(notebookId);

  return (
    <NotebookShell
      title={notebook?.title}
      documents={documents}
      canManageDocuments={canManageDocuments}
      isNotebookLoading={isNotebookLoading}
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
      mode="voice"
      isStudioLocked={false}
      canStartQuiz={hasReadySources}
      isGeneratingQuiz={false}
      canStartQuickstart={hasReadySources}
      isGeneratingQuickstart={false}
      canStartReports={hasReadySources}
      isGeneratingReports={false}
      canStartPresentations={hasReadySources}
      isGeneratingPresentations={false}
      canStartMindmap={hasReadySources}
      isGeneratingMindmap={false}
      canStartFlashcards={hasReadySources}
      isGeneratingFlashcards={false}
      canStartAudio={hasReadySources}
      isGeneratingAudio={false}
      canStartVoice={hasReadySources}
      onGoChat={nav.goChat}
      onGoQuiz={nav.goQuiz}
      onGoQuickstart={nav.goQuickstart}
      onGoReports={nav.goReports}
      onGoPresentations={nav.goPresentations}
      onGoMindmap={nav.goMindmap}
      onGoFlashcards={nav.goFlashcards}
      onGoAudio={nav.goAudio}
      onGoVoice={nav.goVoice}
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
        <DeleteDocumentModal
          isOpen={Boolean(deleteTarget)}
          documentName={deleteTarget?.file_name}
          isDeleting={
            deleteTarget ? deletingDocumentIds.has(deleteTarget.id) : false
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      }
    >
      <VoiceCallShell>
        <VoiceStatusOrb phase={phase} />
        {error ? (
          <p
            className="max-w-md text-center text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <VoiceControls
          phase={phase}
          muted={muted}
          onStart={start}
          onToggleMute={toggleMute}
          onEnd={end}
        />
      </VoiceCallShell>
    </NotebookShell>
  );
}
