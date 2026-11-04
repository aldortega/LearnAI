import { AlertTriangle, CheckCircle, Clock, Loader2, Trash2 } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import type { Document, DocumentStatus } from "../types/documents.types";
import { getSourceExtension } from "../utils/sourceFiles";
import { SourceFileTypeIcon } from "./SourceFileTypeIcon";

type Props = {
  document: Document;
  canManage: boolean;
  isDeleting: boolean;
  onDelete: (document: Document) => void;
};

function renderStatusIcon(status: DocumentStatus) {
  if (status === "done") {
    return <CheckCircle className="h-4 w-4 text-primary" aria-label="Lista" />;
  }
  if (status === "error" || status === "failed") {
    return <AlertTriangle className="h-4 w-4 text-error" aria-label="Error" />;
  }
  if (status === "pending" || status === "queued") {
    return <Clock className="h-4 w-4 text-muted-foreground" aria-label="En cola" />;
  }
  return (
    <Loader2
      className="h-4 w-4 animate-spin text-muted-foreground"
      aria-label="Procesando"
    />
  );
}

export function SourceListItem({ document, canManage, isDeleting, onDelete }: Props) {
  const hasError = document.status === "error" || document.status === "failed";
  const extension = getSourceExtension(document.file_name);
  const displayName = extension
    ? document.file_name.slice(0, -extension.length)
    : document.file_name;

  return (
    <li className="group flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      {renderStatusIcon(document.status)}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground" title={document.file_name}>
          {displayName}
        </p>
        {hasError ? (
          <p className="truncate text-xs text-error" title={document.error ?? undefined}>
            {document.error || "No se pudo procesar"}
          </p>
        ) : null}
      </div>
      <div className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <SourceFileTypeIcon
          fileName={document.file_name}
          className={cn(
            "h-[18px] w-[18px] text-primary transition-opacity",
            canManage && "group-hover:opacity-0 group-has-focus-visible:opacity-0",
            isDeleting && "opacity-0",
          )}
        />
        {canManage ? (
          <button
            type="button"
            className={cn(
              "absolute inset-0 flex cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-error",
              "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "disabled:cursor-not-allowed disabled:opacity-60",
              isDeleting ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={() => onDelete(document)}
            aria-label={`Eliminar ${document.file_name}`}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>
    </li>
  );
}
