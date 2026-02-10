import type { ReactNode } from "react";

import { Header } from "../../home/components/Header";
import { StudioSidebar } from "./StudioSidebar";
import { SourcesSidebar } from "./SourcesSidebar";
import type { Document } from "../types/documents.types";

export type NotebookShellMode = "chat" | "quiz" | "quickstart" | "reports";

type Props = {
  title?: string;
  documents: Document[];
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDeleteDocument: (document: Document) => void;
  mode: NotebookShellMode;
  canStartQuiz: boolean;
  isGeneratingQuiz: boolean;
  canStartQuickstart: boolean;
  isGeneratingQuickstart: boolean;
  canStartReports: boolean;
  isGeneratingReports: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  beforeMain?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function NotebookShell({
  title,
  documents,
  isUploading,
  deletingDocumentIds,
  onAddSource,
  onDeleteDocument,
  mode,
  canStartQuiz,
  isGeneratingQuiz,
  canStartQuickstart,
  isGeneratingQuickstart,
  canStartReports,
  isGeneratingReports,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  beforeMain,
  children,
  footer,
}: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Header title={title} className="flex-none" />
      {beforeMain}

      <main className="flex flex-1 overflow-hidden">
        <SourcesSidebar
          documents={documents}
          isUploading={isUploading}
          deletingDocumentIds={deletingDocumentIds}
          onAddSource={onAddSource}
          onDeleteDocument={onDeleteDocument}
        />
        <div className="flex-1 min-w-0">{children}</div>
        <StudioSidebar
          mode={mode}
          canStartQuiz={canStartQuiz}
          isGeneratingQuiz={isGeneratingQuiz}
          canStartQuickstart={canStartQuickstart}
          isGeneratingQuickstart={isGeneratingQuickstart}
          canStartReports={canStartReports}
          isGeneratingReports={isGeneratingReports}
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
          onGoQuickstart={onGoQuickstart}
          onGoReports={onGoReports}
        />
      </main>
      {footer}
    </div>
  );
}

