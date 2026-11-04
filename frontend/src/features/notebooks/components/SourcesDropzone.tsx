import { UploadCloud } from "lucide-react";
import { useState, type DragEvent } from "react";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";

type Props = {
  disabled: boolean;
  isUploading: boolean;
  onPickFiles: () => void;
  onDropFiles: (files: File[]) => void;
};

export function SourcesDropzone({ disabled, isUploading, onPickFiles, onDropFiles }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLButtonElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) onDropFiles(files);
  };

  return (
    <button
      type="button"
      onClick={onPickFiles}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={disabled}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        disabled
          ? "cursor-not-allowed border-border bg-muted opacity-60"
          : isDragging
            ? "border-primary bg-primary/10"
            : "cursor-pointer border-border bg-muted hover:border-primary hover:bg-muted-hover",
      )}
    >
      <div
        className={cn(
          "grid h-12 w-12 place-items-center rounded-full",
          isDragging ? "bg-primary text-primary-foreground" : "bg-surface text-primary",
        )}
      >
        {isUploading ? <Spinner className="h-5 w-5" /> : <UploadCloud className="h-6 w-6" />}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {isUploading
            ? "Subiendo…"
            : isDragging
              ? "Soltá los archivos para subirlos"
              : "Arrastrá archivos acá"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          o <span className="font-medium text-primary">elegí desde tu equipo</span>
        </p>
      </div>
    </button>
  );
}
