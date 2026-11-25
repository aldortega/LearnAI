import { Plus } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";
import { useSourceCountBump } from "../hooks/useSourceCountBump";
import type { Document } from "../types/documents.types";
import { iconMotion } from "../../../shared/ui/iconMotion";

type Props = {
  documents: Document[];
  isOpen: boolean;
  isUploading: boolean;
  onClick: () => void;
};

export function SourcesPill({ documents, isOpen, isUploading, onClick }: Props) {
  const count = documents.length;
  const shouldAnimateBadge = useSourceCountBump(count);
  const hasError = documents.some((doc) => doc.status === "error" || doc.status === "failed");
  const isProcessing =
    isUploading ||
    documents.some(
      (doc) => doc.status === "pending" || doc.status === "queued" || doc.status === "processing",
    );
  const label = count === 1 ? "1 fuente" : `${count} fuentes`;
  const ariaLabel = `${label}. Ver o agregar fuentes`;
  const statusText = [isProcessing ? "procesando" : null, hasError ? "con errores" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={statusText ? `${ariaLabel} (${statusText})` : ariaLabel}
      title="Ver o agregar fuentes"
      className={cn(
        "group/icon relative inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1.5 sm:gap-2 sm:px-3 text-sm font-medium text-foreground transition-colors",
        "hover:bg-muted-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isOpen && "border-primary ring-1 ring-primary",
      )}
    >
      {isProcessing ? (
        <Spinner className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Plus className={cn("h-4 w-4 text-primary", iconMotion.rotateQuarterOnHover)} />
      )}
      <span className="hidden sm:inline">Fuentes</span>
      <span className="sm:hidden">{count}</span>
      {hasError ? <span className="h-2 w-2 rounded-full bg-error sm:hidden" aria-hidden /> : null}
      {count > 0 ? (
        <span
          key={count}
          aria-hidden
          className={cn(
            "absolute -right-1.5 -top-1.5 hidden h-5 sm:grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold leading-none ring-2 ring-surface",
            shouldAnimateBadge && "animate-pop-in motion-reduce:animate-none",
            hasError ? "bg-error text-surface" : "bg-primary text-primary-foreground",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
