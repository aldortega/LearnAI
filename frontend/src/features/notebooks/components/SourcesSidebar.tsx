import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";
import type { Document, DocumentStatus } from "../types/documents.types";

type Props = {
  documents: Document[];
  canManageDocuments: boolean;
  isNotebookLoading?: boolean;
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDeleteDocument: (document: Document) => void;
};

export function SourcesSidebar({
  documents,
  canManageDocuments,
  isNotebookLoading = false,
  isUploading,
  deletingDocumentIds,
  onAddSource,
  onDeleteDocument,
}: Props) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("sourcesSidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("sourcesSidebarOpen", String(isOpen));
  }, [isOpen]);

  const renderStatusIcon = (status: DocumentStatus) => {
    if (status === "done") {
      return <CheckCircle className="h-4 w-4 text-primary" />;
    }
    if (status === "error" || status === "failed") {
      return <AlertTriangle className="h-4 w-4 text-error" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden border-r border-border bg-muted transition-all duration-300 ease-in-out",
        "dark:border-border",
        isOpen ? "w-64" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-border",
          "dark:border-border",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen ? (
          <h2 className="whitespace-nowrap text-sm font-semibold text-foreground">
            Fuentes
          </h2>
        ) : null}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-muted-foreground hover:bg-muted-hover"
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className={cn("flex-1 overflow-y-auto p-4", !isOpen && "px-2")}>
        {isOpen ? (
          <>
            <Button
              className="mb-3 w-full whitespace-nowrap"
              leftIcon={isUploading ? undefined : <Plus className="h-4 w-4" />}
              onClick={onAddSource}
              loading={isUploading}
              disabled={!canManageDocuments || isNotebookLoading}
            >
              {isUploading ? "Subiendo…" : "Añadir fuente"}
            </Button>

            {!isNotebookLoading && !canManageDocuments ? (
              <p className="mb-4 text-xs text-muted-foreground" role="alert">
                Tienes acceso de solo lectura para documentos.
              </p>
            ) : null}

            {documents.length === 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center text-center">
                <div className="mb-3 rounded-2xl bg-muted p-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="w-full text-sm text-muted-foreground">
                  Las fuentes guardadas aparecerán aquí.
                </p>
                <p className="mt-1 w-full text-xs text-muted-foreground">
                  Haz clic en el botón Añadir fuente para cargar PDF, DOCX, TXT o PPTX.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => {
                  const isDeleting = deletingDocumentIds.has(document.id);

                  return (
                    <li
                      key={document.id}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <div className="relative flex h-4 w-4 items-center justify-center">
                        <div
                          className={cn(
                            "absolute inset-0 flex items-center justify-center",
                            canManageDocuments && "transition-opacity group-hover:opacity-0",
                          )}
                        >
                          {renderStatusIcon(document.status)}
                        </div>
                        {canManageDocuments ? (
                          <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => onDeleteDocument(document)}
                            aria-label={`Eliminar ${document.file_name}`}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
                            )}
                          </button>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate whitespace-nowrap text-sm font-medium text-foreground">
                          {document.file_name}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              className="rounded-md bg-primary p-2 text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              title="Añadir fuente"
              onClick={onAddSource}
              disabled={isUploading || !canManageDocuments || isNotebookLoading}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

