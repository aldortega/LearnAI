import type { PresentationOut } from "../types/presentations.types";
import { PresentationPreviewCard } from "./PresentationPreviewCard";
import { PresentationPreviewSkeletonCard } from "./PresentationPreviewSkeletonCard";

type Props = {
  presentations: PresentationOut[];
  isGenerating: boolean;
  deletingPresentationId: string | null;
  onSelectPresentation: (presentationId: string) => void;
  onDeletePresentation: (presentation: PresentationOut) => void;
};

export function PresentationsHistoryList({
  presentations,
  isGenerating,
  deletingPresentationId,
  onSelectPresentation,
  onDeletePresentation,
}: Props) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">
        Presentaciones generadas{" "}
        <span className="font-normal text-muted-foreground">
          ({presentations.length})
        </span>
      </h3>

      {presentations.length > 0 || isGenerating ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {presentations.map((presentation) => (
            <PresentationPreviewCard
              key={presentation.id}
              presentation={presentation}
              isDeleting={deletingPresentationId === presentation.id}
              isAnyPresentationDeleting={Boolean(deletingPresentationId)}
              onSelectPresentation={onSelectPresentation}
              onDeletePresentation={onDeletePresentation}
            />
          ))}
          {isGenerating ? <PresentationPreviewSkeletonCard /> : null}
        </div>
      ) : null}
    </section>
  );
}
