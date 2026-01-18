import type { ReactNode } from "react";

import { Header } from "../../home/components/Header";
import { StudioSidebar } from "./StudioSidebar";
import { SourcesSidebar } from "./SourcesSidebar";
import type { Document } from "../types/documents.types";

export type NotebookShellMode = "chat" | "quiz";

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
  onGoChat: () => void;
  onGoQuiz: () => void;
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
  onGoChat,
  onGoQuiz,
  beforeMain,
  children,
  footer,
}: Props) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white dark:bg-zinc-950">
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
          onGoChat={onGoChat}
          onGoQuiz={onGoQuiz}
        />
      </main>
      {footer}
    </div>
  );
}
