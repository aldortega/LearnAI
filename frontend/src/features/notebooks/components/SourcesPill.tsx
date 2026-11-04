import { FileText } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";
import type { Document } from "../types/documents.types";

type Props = {
  documents: Document[];
  isOpen: boolean;
  isUploading: boolean;
  onClick: () => void;
};

export function SourcesPill({ documents, isOpen, isUploading, onClick }: Props) {
  const count = documents.length;
  const hasError = documents.some((doc) => doc.status === "error" || doc.status === "failed");
  const isProcessing =
    isUploading ||
    documents.some(
      (doc) => doc.status === "pending" || doc.status === "queued" || doc.status === "processing",
    );
  const label = count === 1 ? "1 fuente" : `${count} fuentes`;
  const statusText = [isProcessing ? "procesando" : null, hasError ? "con errores" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={statusText ? `${label} (${statusText})` : label}
      className={cn(
        "relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors",
        "hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isOpen && "border-primary ring-1 ring-primary",
      )}
    >
      {isProcessing ? (
        <Spinner className="h-3.5 w-3.5 text-primary" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{label}</span>
      {hasError ? <span className="h-2 w-2 rounded-full bg-error" aria-hidden /> : null}
    </button>
  );
}
