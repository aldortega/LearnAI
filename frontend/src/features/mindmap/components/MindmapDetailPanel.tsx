import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  selectedNodeTitle: string | null;
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
};

export function MindmapDetailPanel({
  isOpen,
  onClose,
  selectedNodeTitle,
  explanation,
  isLoading,
  error,
  isStale,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedNodeTitle ?? "Detalle del nodo"}
      maxWidth="3xl"
      className="max-h-[72vh] motion-reduce:animate-none [animation:ft-slideUp_280ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="min-h-[240px] max-h-[58vh] overflow-y-auto pr-1">
        {isStale ? (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            Este mapa esta desactualizado. Regeneralo para obtener explicaciones nuevas.
          </p>
        ) : null}

        {!selectedNodeTitle ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Selecciona un nodo para ver su explicacion.
          </p>
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
          <div className="mt-4 space-y-3 break-words text-sm leading-relaxed text-foreground">
            {explanation.split("\n\n").map((paragraph, index) => (
              <p key={`${selectedNodeTitle ?? "node"}-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
