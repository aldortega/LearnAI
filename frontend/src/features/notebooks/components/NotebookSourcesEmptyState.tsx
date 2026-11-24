import { useState, type DragEvent } from "react";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";
import { EmptySourcesIllustration } from "../../../shared/ui/illustrations/EmptySourcesIllustration";

type Props = {
  phase?: "idle" | "uploading" | "processing";
  canManageDocuments: boolean;
  onDropFiles: (files: File[]) => void;
};

export function NotebookSourcesEmptyState({
  phase = "idle",
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

  const isBusy = phase !== "idle";
  const title =
    phase === "uploading"
      ? "Subiendo tus fuentes..."
      : phase === "processing"
        ? "Tus fuentes se están procesando"
        : "Subí tus fuentes para comenzar";
  const description =
    phase === "uploading"
      ? "No cierres esta página mientras se suben los archivos."
      : phase === "processing"
        ? "Cuando termine la ingesta, el studio se habilitará automáticamente. Mientras tanto, podés subir más fuentes."
        : "Añadí al menos una fuente para habilitar los modos de estudio y comenzar a estudiar con IA.";

  return (
    <div
      className="flex h-full items-center justify-center p-8 text-center"
      aria-busy={isBusy}
    >
      <div className="max-w-md">
        {isBusy ? (
          <div className="mx-auto mb-4 grid h-20 place-items-center text-primary">
            <Spinner className="h-10 w-10 border-4" />
          </div>
        ) : (
          <EmptySourcesIllustration className="mx-auto mb-4 h-auto w-48" />
        )}
        <h2 className="mb-2 text-xl font-semibold text-foreground">{title}</h2>
        <p className="mb-6 text-muted-foreground" role={isBusy ? "status" : undefined}>
          {description}
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
