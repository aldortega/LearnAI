import { Upload } from "lucide-react";
import { useState, type DragEvent } from "react";

import { cn } from "../../../shared/lib/cn";

type Props = {
  canManageDocuments: boolean;
  onDropFile: (file: File) => void;
};

export function NotebookSourcesEmptyState({
  canManageDocuments,
  onDropFile,
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

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onDropFile(file);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Sube tus fuentes para comenzar
        </h2>
        <p className="mb-6 text-muted-foreground">
          Añade al menos una fuente para habilitar el studio y comenzar a estudiar
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
            ? "Arrastra y suelta un archivo aquí"
            : "No tienes permisos para subir fuentes en este cuaderno"}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Formatos permitidos: PDF, DOCX, TXT o PPTX.
        </p>
      </div>
    </div>
  );
}
