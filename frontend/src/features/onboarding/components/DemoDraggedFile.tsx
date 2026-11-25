import { FileText, MousePointer2 } from "lucide-react";

import { DEMO_SOURCE_FILE } from "../utils/demoContent";

type Props = {
  isOverDropzone: boolean;
};

export function DemoDraggedFile({ isOverDropzone }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="animate-drag-in motion-reduce:animate-none">
        <div
          className={`relative flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-xl transition-transform duration-300 ${
            isOverDropzone ? "scale-95" : "scale-100"
          }`}
        >
          <FileText className="h-4 w-4 text-error" />
          <span className="max-w-44 truncate text-xs font-medium text-foreground">{DEMO_SOURCE_FILE}</span>
          <MousePointer2 className="absolute -right-3 -bottom-3 h-5 w-5 fill-foreground text-surface drop-shadow" />
        </div>
      </div>
    </div>
  );
}
