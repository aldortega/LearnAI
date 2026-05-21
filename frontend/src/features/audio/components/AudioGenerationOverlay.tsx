import { LoaderCircle } from "lucide-react";

type Props = {
  isVisible: boolean;
  message?: string;
};

export function AudioGenerationOverlay({ isVisible, message }: Props) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-8 py-6 shadow-lg">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">
          {message ?? "Generando podcast..."}
        </p>
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          La sintesis de voz puede tardar entre 30 y 90 segundos.
        </p>
      </div>
    </div>
  );
}
