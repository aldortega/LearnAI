import type { ReactNode } from "react";

import { Header } from "../../home/components/Header";
import { StudioSidebar } from "./StudioSidebar";
import { SourcesSidebar } from "./SourcesSidebar";
import type { Document } from "../types/documents.types";

export type NotebookShellMode = "chat" | "quiz" | "quickstart" | "reports" | "mindmap";

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
  canStartMindmap: boolean;
  isGeneratingMindmap: boolean;
  onGoChat: () => void;
  onGoQuiz: () => void;
  onGoQuickstart: () => void;
  onGoReports: () => void;
  onGoMindmap: () => void;
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
  canStartMindmap,
  isGeneratingMindmap,
  onGoChat,
  onGoQuiz,
  onGoQuickstart,
  onGoReports,
  onGoMindmap,
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
          isUploading={isUploading}
          deletingDocumentIds={deletingDocumentIds}
          onAddSource={onAddSource}
          onDeleteDocument={onDeleteDocument}
        />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
        <StudioSidebar
          mode={mode}
          canStartQuiz={canStartQuiz}
          isGeneratingQuiz={isGeneratingQuiz}
          canStartQuickstart={canStartQuickstart}
          isGeneratingQuickstart={isGeneratingQuickstart}
          canStartReports={canStartReports}
          isGeneratingReports={isGeneratingReports}
          canStartMindmap={canStartMindmap}
          isGeneratingMindmap={isGeneratingMindmap}
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
          onGoQuickstart={onGoQuickstart}
          onGoReports={onGoReports}
          onGoMindmap={onGoMindmap}
        />
      </main>
      {footer}
    </div>
  );
}

