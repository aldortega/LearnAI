import { AlertTriangle } from "lucide-react";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isRegenerating: boolean;
  topicCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RegenerateQuickstartModal({
  isOpen,
  isRegenerating,
  topicCount = 0,
  onCancel,
  onConfirm,
}: Props) {
  const hasTopics = topicCount > 0;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Regenerar inicio rápido">
      <div className="space-y-4">
        <p className="text-sm text-foreground/80">
          Generaremos un nuevo resumen y nuevos temas a partir de tus fuentes
          actuales.
        </p>

        {hasTopics ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="font-medium">
                Se reemplazarán {topicCount === 1 ? "tu tema actual" : `tus ${topicCount} temas actuales`}.
              </p>
              <p className="text-xs text-warning/90">
                Los temas que agregaste manualmente y el orden actual se descartarán.
                Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isRegenerating}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isRegenerating}>
            Regenerar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
