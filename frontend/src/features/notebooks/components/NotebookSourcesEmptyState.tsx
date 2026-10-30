import { useState, type DragEvent } from "react";

import { cn } from "../../../shared/lib/cn";
import { EmptySourcesIllustration } from "../../../shared/ui/illustrations/EmptySourcesIllustration";

type Props = {
  canManageDocuments: boolean;
  onDropFiles: (files: File[]) => void;
};

export function NotebookSourcesEmptyState({
  canManageDocuments,
  onDropFiles,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!canManageDocuments) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    if (!canManageDocuments) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!canManageDocuments) return;
    event.preventDefault();
    setIsDragging(false);

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) {
      onDropFiles(files);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <EmptySourcesIllustration className="mx-auto mb-4 h-auto w-48" />
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Subí tus fuentes para comenzar
        </h2>
        <p className="mb-6 text-muted-foreground">
          Añadí al menos una fuente para habilitar el studio y comenzar a estudiar
          con IA.
        </p>
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-sm transition-all",
            canManageDocuments
              ? isDragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted-foreground"
              : "cursor-not-allowed border-border bg-surface text-muted-foreground opacity-70",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {canManageDocuments
            ? "Arrastrá y soltá uno o varios archivos aquí"
            : "No tenés permisos para subir fuentes en este cuaderno"}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Formatos permitidos: PDF, DOCX, TXT o PPTX.
        </p>
      </div>
    </div>
  );
}
