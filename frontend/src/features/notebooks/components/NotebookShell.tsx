import { useCallback, useState, type ReactNode } from "react";

import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { Header } from "../../home/components/Header";
import { SourcesModal } from "./SourcesModal";
import { SourcesPill } from "./SourcesPill";
import { StudioRail } from "./StudioRail";
import type { Document } from "../types/documents.types";

export type NotebookShellMode =
  | "chat"
  | "quiz"
  | "quickstart"
  | "reports"
  | "presentations"
  | "mindmap"
  | "flashcards"
  | "audio"
  | "voice";

type Props = {
  title?: string;
  documents: Document[];
  canManageDocuments: boolean;
  isNotebookLoading?: boolean;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDropFiles: (files: File[]) => void;
  onDeleteDocument: (document: Document) => void;
  mode: NotebookShellMode;
  isStudioLocked: boolean;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  canStartReports: boolean;
  isGeneratingReports: boolean;
  canStartPresentations: boolean;
  isGeneratingPresentations: boolean;
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  canStartFlashcards: boolean;
  isGeneratingFlashcards: boolean;
  canStartAudio?: boolean;
  isGeneratingAudio?: boolean;
  canStartVoice?: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoPresentations: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
  onGoAudio?: () => void;
  onGoVoice?: () => void;
  beforeMain?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function NotebookShell({
  title,
  documents,
  canManageDocuments,
  isNotebookLoading = false,
  isUploading,
  deletingDocumentIds,
  onAddSource,
  onDropFiles,
  onDeleteDocument,
  mode,
  isStudioLocked,
  canStartQuiz,
  isGeneratingQuiz,
  canStartQuickstart,
  isGeneratingQuickstart,
  canStartReports,
  isGeneratingReports,
  canStartPresentations,
  isGeneratingPresentations,
  canStartMindmap,
  isGeneratingMindmap,
  canStartFlashcards,
  isGeneratingFlashcards,
  canStartAudio = false,
  isGeneratingAudio = false,
  canStartVoice = false,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoPresentations,
  onGoMindmap,
  onGoFlashcards,
  onGoAudio,
  onGoVoice,
  beforeMain,
  children,
  footer,
}: Props) {
  useDocumentTitle(title);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const closeSources = useCallback(() => setIsSourcesOpen(false), []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-surface">
      <Header
        title={title}
        className="flex-none"
        actions={
          <SourcesPill
            documents={documents}
            isOpen={isSourcesOpen}
            isUploading={isUploading}
            onClick={() => setIsSourcesOpen((open) => !open)}
          />
        }
      />
      {beforeMain}

      <main className="flex min-h-0 flex-1 flex-col-reverse overflow-hidden overscroll-none md:flex-row">
        <StudioRail
          mode={mode}
          isStudioLocked={isStudioLocked}
          canStartQuiz={canStartQuiz}
          isGeneratingQuiz={isGeneratingQuiz}
          canStartQuickstart={canStartQuickstart}
          isGeneratingQuickstart={isGeneratingQuickstart}
          canStartReports={canStartReports}
          isGeneratingReports={isGeneratingReports}
          canStartPresentations={canStartPresentations}
          isGeneratingPresentations={isGeneratingPresentations}
          canStartMindmap={canStartMindmap}
          isGeneratingMindmap={isGeneratingMindmap}
          canStartFlashcards={canStartFlashcards}
          isGeneratingFlashcards={isGeneratingFlashcards}
          canStartAudio={canStartAudio}
          isGeneratingAudio={isGeneratingAudio}
          canStartVoice={canStartVoice}
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
          onGoQuickstart={onGoQuickstart}
          onGoReports={onGoReports}
          onGoPresentations={onGoPresentations}
          onGoMindmap={onGoMindmap}
          onGoFlashcards={onGoFlashcards}
          onGoAudio={onGoAudio}
          onGoVoice={onGoVoice}
        />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
      </main>
      <SourcesModal
        isOpen={isSourcesOpen}
        onClose={closeSources}
        documents={documents}
        canManageDocuments={canManageDocuments}
        isNotebookLoading={isNotebookLoading}
        isUploading={isUploading}
        deletingDocumentIds={deletingDocumentIds}
        onAddSource={onAddSource}
        onDropFiles={onDropFiles}
        onDeleteDocument={onDeleteDocument}
      />
      {footer}
    </div>
  );
}

