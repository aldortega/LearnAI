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
  | "mindmap"
  | "flashcards";

type Props = {
  title?: string;
  documents: Document[];
  canManageDocuments: boolean;
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
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  canStartFlashcards: boolean;
  isGeneratingFlashcards: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoMindmap: () => void;
  onGoFlashcards: () => void;
  beforeMain?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function NotebookShell({
  title,
  documents,
  canManageDocuments,
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
  canStartMindmap,
  isGeneratingMindmap,
  canStartFlashcards,
  isGeneratingFlashcards,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoMindmap,
  onGoFlashcards,
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
          canStartMindmap={canStartMindmap}
          isGeneratingMindmap={isGeneratingMindmap}
          canStartFlashcards={canStartFlashcards}
          isGeneratingFlashcards={isGeneratingFlashcards}
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
          onGoQuickstart={onGoQuickstart}
          onGoReports={onGoReports}
          onGoMindmap={onGoMindmap}
          onGoFlashcards={onGoFlashcards}
        />
      </main>
      {footer}
    </div>
  );
}

