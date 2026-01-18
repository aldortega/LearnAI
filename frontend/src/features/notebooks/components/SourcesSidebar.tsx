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
import { useState, useEffect } from "react";

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
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem("sourcesSidebarOpen");
    return saved !== null ? saved === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("sourcesSidebarOpen", String(isOpen));
  }, [isOpen]);

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
        "relative flex h-full flex-col overflow-hidden border-r border-zinc-200 bg-zinc-50 transition-all duration-300 ease-in-out",
        "dark:border-zinc-800 dark:bg-zinc-900",
        isOpen ? "w-72" : "w-12",
      )}
    >
      <div
        className={cn(
          "flex h-[45px] items-center border-b border-zinc-200",
          "dark:border-zinc-800",
          isOpen ? "justify-between px-4" : "justify-center",
        )}
      >
        {isOpen && (
            <h2 className="text-sm font-semibold text-zinc-900 whitespace-nowrap dark:text-zinc-100">
              Fuentes
            </h2>
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
              className="mb-6 w-full whitespace-nowrap"
              leftIcon={isUploading ? undefined : <Plus className="h-4 w-4" />}
              onClick={onAddSource}
              loading={isUploading}
            >
              {isUploading ? "Subiendo…" : "Añadir fuente"}
            </Button>

            {documents.length === 0 ? (
              <div className="mt-10 flex flex-col items-center justify-center text-center">
                <div className="mb-3 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
                  <FileText className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                </div>
                <p className="w-full truncate text-sm text-zinc-500 dark:text-zinc-400">
                  Las fuentes guardadas aparecerán aquí.
                </p>
                <p className="mt-1 w-full truncate text-xs text-zinc-400 dark:text-zinc-500">
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
                        className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
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
                             <Trash2 className="h-4 w-4 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400" />

                          )}
                        </button>
                      </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 whitespace-nowrap dark:text-zinc-100">
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
              className="rounded-md p-2 bg-emerald-900 text-white shadow-sm transition-colors hover:bg-emerald-800 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
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
