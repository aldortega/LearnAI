import { DeleteDocumentModal } from "../../notebooks/components/DeleteDocumentModal";
import type { Document } from "../../notebooks/types/documents.types";

import type { PresentationOut } from "../types/presentations.types";
import { DeletePresentationModal } from "./DeletePresentationModal";

type Props = {
  deleteDocumentTarget: Document | null;
  deletingDocumentIds: Set<string>;
  onCancelDocumentDelete: () => void;
  onConfirmDocumentDelete: () => void;
  deletePresentationTarget: PresentationOut | null;
  deletingPresentationId: string | null;
  deleteError: string | null;
  onCancelPresentationDelete: () => void;
  onConfirmPresentationDelete: () => void;
};

export function PresentationsFooterModals({
  deleteDocumentTarget,
  deletingDocumentIds,
  onCancelDocumentDelete,
  onConfirmDocumentDelete,
  deletePresentationTarget,
  deletingPresentationId,
  deleteError,
  onCancelPresentationDelete,
  onConfirmPresentationDelete,
}: Props) {
  return (
    <>
      <DeleteDocumentModal
        isOpen={Boolean(deleteDocumentTarget)}
        documentName={deleteDocumentTarget?.file_name}
        isDeleting={
          deleteDocumentTarget ? deletingDocumentIds.has(deleteDocumentTarget.id) : false
        }
        onCancel={onCancelDocumentDelete}
        onConfirm={onConfirmDocumentDelete}
      />
      <DeletePresentationModal
        isOpen={Boolean(deletePresentationTarget)}
        presentationTitle={deletePresentationTarget?.title}
        isDeleting={deletingPresentationId === deletePresentationTarget?.id}
        error={deleteError}
        onCancel={onCancelPresentationDelete}
        onConfirm={onConfirmPresentationDelete}
      />
    </>
  );
}
