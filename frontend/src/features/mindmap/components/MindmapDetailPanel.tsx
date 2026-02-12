type Props = {
  selectedNodeTitle: string | null;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
};

export function MindmapDetailPanel({
  selectedNodeTitle,
  explanation,
  isLoading,
  error,
  isStale,
}: Props) {
  return (
    <aside className="w-full shrink-0 border-t border-border bg-muted/40 lg:w-[320px] lg:border-t-0 lg:border-l">
      <div className="h-full overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-foreground">Detalle del nodo</h3>

        {isStale ? (
          <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            Este mapa esta desactualizado. Regeneralo para obtener explicaciones nuevas.
          </p>
        ) : null}

        {!selectedNodeTitle ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Selecciona un nodo para ver su explicacion.
          </p>
        ) : null}

        {selectedNodeTitle ? (
          <p className="mt-3 text-sm font-medium text-foreground">{selectedNodeTitle}</p>
        ) : null}

        {isLoading ? (
          <div className="mt-8 space-y-2" aria-hidden="true">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[86%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[78%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[84%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[74%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[82%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[76%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[88%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[70%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-muted" />
            <div className="h-4 w-[66%] animate-pulse rounded bg-muted" />
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}

        {!isLoading && !error && explanation ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground">
            {explanation.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
