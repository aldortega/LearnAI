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
          <p className="mt-4 text-sm text-muted-foreground">Cargando explicacion...</p>
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
