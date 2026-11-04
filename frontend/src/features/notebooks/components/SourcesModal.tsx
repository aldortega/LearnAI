import type { Document } from "../types/documents.types";
import { Modal } from "../../../shared/ui/Modal";
import { SourceListItem } from "./SourceListItem";
import { SourcesDropzone } from "./SourcesDropzone";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
  canManageDocuments: boolean;
  isNotebookLoading: boolean;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDropFiles: (files: File[]) => void;
  onDeleteDocument: (document: Document) => void;
};

export function SourcesModal({
  isOpen,
  onClose,
  documents,
  canManageDocuments,
  isNotebookLoading,
  isUploading,
  deletingDocumentIds,
  onAddSource,
  onDropFiles,
  onDeleteDocument,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cargar fuentes" maxWidth="3xl">
      <SourcesDropzone
        disabled={!canManageDocuments || isNotebookLoading || isUploading}
        isUploading={isUploading}
        onPickFiles={onAddSource}
        onDropFiles={onDropFiles}
      />

      {!isNotebookLoading && !canManageDocuments ? (
        <p className="mt-3 text-xs text-muted-foreground" role="alert">
          Tienes acceso de solo lectura para documentos.
        </p>
      ) : null}

      {documents.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            {documents.length === 1 ? "1 fuente" : `${documents.length} fuentes`}
          </h3>
          <ul className="grid max-h-[40vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {documents.map((document) => (
              <SourceListItem
                key={document.id}
                document={document}
                canManage={canManageDocuments}
                isDeleting={deletingDocumentIds.has(document.id)}
                onDelete={onDeleteDocument}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </Modal>
  );
}
