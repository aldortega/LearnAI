import { UploadCloud } from "lucide-react";

import type { DemoSourceStatus } from "../types/onboarding.types";
import { DemoDraggedFile } from "./DemoDraggedFile";

type Props = {
  status: DemoSourceStatus;
};

export function DemoDropzone({ status }: Props) {
  const isHovering = status === "hovering";
  const showDraggedFile = status === "dragging" || isHovering;
  return (
    <div
      className={`relative flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-xs transition-all duration-300 ${
        isHovering
          ? "scale-[1.02] border-primary bg-primary/10 text-primary"
          : "border-border-strong bg-surface text-muted-foreground"
      }`}
    >
      <UploadCloud className={`h-6 w-6 text-primary transition-transform duration-300 ${isHovering ? "-translate-y-1" : ""}`} />
      <span className={showDraggedFile ? "opacity-0" : undefined}>
        {isHovering ? "Soltá tu archivo acá" : "PDF · DOCX · PPTX · TXT"}
      </span>
      {showDraggedFile ? <DemoDraggedFile isOverDropzone={isHovering} /> : null}
    </div>
  );
}
