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
import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { Button } from "../../../shared/ui/Button";
import type { Document, DocumentStatus } from "../types/documents.types";

type Props = {
  documents: Document[];
  isUploading: boolean;
  deletingDocumentIds: Set<string>;
  onAddSource: () => void;
  onDeleteDocument: (document: Document) => void;
};

// const statusLabels: Record<DocumentStatus, string> = {
//   pending: "En cola",
//   processing: "Procesando",
//   done: "Listo",
//   error: "Error",
//   queued: "En cola",
//   failed: "Error",
// };

export function SourcesSidebar({
  documents,
  isUploading,
  deletingDocumentIds,
  onAddSource,
  onDeleteDocument,
}: Props) {
  const [isOpen, setIsOpen] = useState(true);

  const renderStatusIcon = (status: DocumentStatus) => {
    if (status === "done") {
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    }
    if (status === "error" || status === "failed") {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />;
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col border-r border-zinc-200 bg-zinc-50 transition-all duration-300 ease-in-out",
        isOpen ? "w-80" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-zinc-200",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen && (
          <h2 className="text-sm font-semibold text-zinc-900">Fuentes</h2>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-200"
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
              className="mb-6 w-full"
              leftIcon={isUploading ? undefined : <Plus className="h-4 w-4" />}
              onClick={onAddSource}
              loading={isUploading}
            >
              {isUploading ? "Subiendo…" : "Añadir fuente"}
            </Button>

            {documents.length === 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center text-center">
                <div className="mb-3 rounded-2xl bg-zinc-100 p-3">
                  <FileText className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-sm text-zinc-500">
                  Las fuentes guardadas aparecerán aquí.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Haz clic en el botón Añadir fuente de arriba para añadir PDFs.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((document) => {
                  const isDeleting = deletingDocumentIds.has(document.id);

                  return (
                    <li
                      key={document.id}
                      className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2"
                    >
                      <div className="relative flex h-4 w-4 items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center transition-opacity group-hover:opacity-0">
                          {renderStatusIcon(document.status)}
                        </div>
                        <button
                          type="button"
                          className={cn(
                            "absolute inset-0 flex items-center justify-center transition-opacity",
                            "opacity-0 group-hover:opacity-100",
                          )}
                          onClick={() => onDeleteDocument(document)}
                          aria-label={`Eliminar ${document.file_name}`}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-500" />
                          )}
                        </button>
                      </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {document.file_name}
                      </p>
                      {/* <p className="text-xs text-zinc-400">
                        {statusLabels[document.status] ?? "Procesando"}
                      </p> */}
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
              className="rounded-md p-2 text-zinc-500 hover:bg-zinc-200"
              title="Añadir fuente"
              onClick={onAddSource}
              disabled={isUploading}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
