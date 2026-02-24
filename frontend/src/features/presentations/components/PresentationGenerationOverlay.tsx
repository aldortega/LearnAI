import { Spinner } from "../../../shared/ui/Spinner";

type Props = {
  isVisible: boolean;
};

export function PresentationGenerationOverlay({ isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-5 py-4 shadow-lg">
        <Spinner className="h-5 w-5" />
        <p className="text-sm font-medium text-foreground">
          Generando presentacion...
        </p>
      </div>
    </div>
  );
}
