import { MonitorPlay } from "lucide-react";

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

      {presentations.length === 0 && !isGenerating ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <MonitorPlay className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Sin presentaciones aun
            </p>
            <p className="text-sm text-muted-foreground">
              Genera tu primera presentacion a partir de tus fuentes.
            </p>
          </div>
        </div>
      ) : (
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
      )}
    </section>
  );
}
