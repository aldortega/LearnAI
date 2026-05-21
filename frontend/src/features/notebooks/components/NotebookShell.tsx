import type { ReactNode } from "react";

import { Header } from "../../home/components/Header";
import { StudioSidebar } from "./StudioSidebar";
import { SourcesSidebar } from "./SourcesSidebar";
import type { Document } from "../types/documents.types";

export type NotebookShellMode =
  | "chat"
  | "quiz"
  | "quickstart"
  | "reports"
  | "presentations"
  | "mindmap"
  | "flashcards"
  | "audio";

type Props = {
  title?: string;
  documents: Document[];
  canManageDocuments: boolean;
  isNotebookLoading?: boolean;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
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
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoPresentations: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
  onGoAudio?: () => void;
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
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoPresentations,
  onGoMindmap,
  onGoFlashcards,
  onGoAudio,
  beforeMain,
  children,
  footer,
}: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden overscroll-none bg-surface">
      <Header title={title} className="flex-none" />
      {beforeMain}

      <main className="flex min-h-0 flex-1 overflow-hidden overscroll-none">
        <SourcesSidebar
          documents={documents}
          canManageDocuments={canManageDocuments}
          isNotebookLoading={isNotebookLoading}
          isUploading={isUploading}
          deletingDocumentIds={deletingDocumentIds}
          onAddSource={onAddSource}
          onDeleteDocument={onDeleteDocument}
        />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
        <StudioSidebar
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
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
          onGoQuickstart={onGoQuickstart}
          onGoReports={onGoReports}
          onGoPresentations={onGoPresentations}
          onGoMindmap={onGoMindmap}
          onGoFlashcards={onGoFlashcards}
          onGoAudio={onGoAudio}
        />
      </main>
      {footer}
    </div>
  );
}

