import { useCallback, useState, type ReactNode } from "react";

import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle";
import { Header } from "../../home/components/Header";
import { SourcesModal } from "./SourcesModal";
import { SourcesPill } from "./SourcesPill";
import { ModeSwitcherSheet } from "./ModeSwitcherSheet";
import { StudioRail } from "./StudioRail";
import { ModeSwitcherContext } from "../hooks/useModeSwitcher";
import {
  useStudioModeItems,
  type StudioMode,
  type StudioModeOptions,
} from "../hooks/useStudioModeItems";
import type { Document } from "../types/documents.types";

export type NotebookShellMode = StudioMode;

type Props = StudioModeOptions & {
  title?: string;
  documents: Document[];
  canManageDocuments: boolean;
  isNotebookLoading?: boolean;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDropFiles: (files: File[]) => void;
  onDeleteDocument: (document: Document) => void;
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
  beforeMain,
  children,
  footer,
  ...studioOptions
}: Props) {
  useDocumentTitle(title);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const closeSources = useCallback(() => setIsSourcesOpen(false), []);
  const [isModeSwitcherOpen, setIsModeSwitcherOpen] = useState(false);
  const openModeSwitcher = useCallback(() => setIsModeSwitcherOpen(true), []);
  const closeModeSwitcher = useCallback(() => setIsModeSwitcherOpen(false), []);
  const studioItems = useStudioModeItems(studioOptions);

  return (
    <div className="flex h-dvh flex-col overflow-hidden overscroll-none bg-surface">
      <Header
        title={title}
        className="flex-none"
        titleAddon={
          <SourcesPill
            documents={documents}
            isOpen={isSourcesOpen}
            isUploading={isUploading}
            onClick={() => setIsSourcesOpen((open) => !open)}
          />
        }
      />
      {beforeMain}

      <main className="flex min-h-0 flex-1 overflow-hidden overscroll-none">
        <StudioRail items={studioItems} />
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          <ModeSwitcherContext.Provider value={openModeSwitcher}>
            {children}
          </ModeSwitcherContext.Provider>
        </div>
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
      <ModeSwitcherSheet
        isOpen={isModeSwitcherOpen}
        items={studioItems}
        onClose={closeModeSwitcher}
      />
      {footer}
    </div>
  );
}

