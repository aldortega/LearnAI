import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isRegenerating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RegenerateMindmapModal({
  isOpen,
  isRegenerating,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Regenerar mapa mental">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esto reemplazara el mapa mental actual con una nueva version.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-border"
            onClick={onCancel}
            disabled={isRegenerating}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isRegenerating}
            disabled={isRegenerating}
          >
            Regenerar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
