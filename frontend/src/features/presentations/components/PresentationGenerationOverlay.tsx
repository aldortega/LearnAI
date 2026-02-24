type Props = {
  isVisible: boolean;
};

export function PresentationGenerationOverlay({ isVisible }: Props) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-20 bg-background/70 p-6 backdrop-blur-sm">
      <div className="mx-auto h-full w-full max-w-5xl animate-pulse rounded-2xl border border-border bg-surface/90 p-6 shadow-lg">
        <div className="mb-6 space-y-3">
          <div className="h-6 w-2/3 rounded-md bg-muted" />
          <div className="h-4 w-1/2 rounded-md bg-muted" />
        </div>
        <div className="space-y-4">
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
          <div className="h-28 rounded-xl bg-muted" />
        </div>
        <p className="mt-6 text-sm font-medium text-muted-foreground">
          Generando presentacion...
        </p>
      </div>
    </div>
  );
}
