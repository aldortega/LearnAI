import { SendHorizontal } from "lucide-react";

import { CitationChip } from "../../../shared/ui/CitationChip";
import { DNA_SOURCE, MITOCHONDRIA_SOURCE, PREVIEW_QUESTION } from "../utils/previewContent";

export function PreviewChat() {
  return (
    <div className="flex flex-col gap-5 p-5">
      <p className="ml-auto max-w-[85%] rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground">
        {PREVIEW_QUESTION}
      </p>

      <p className="text-sm leading-6 text-foreground">
        Las mitocondrias realizan la respiración celular: transforman la glucosa en ATP, la
        energía que usa la célula
        <CitationChip label={1} source={MITOCHONDRIA_SOURCE} />. Además, tienen ADN propio y se
        dividen de forma independiente
        <CitationChip label={2} source={DNA_SOURCE} />.
      </p>

      <div className="mt-auto flex h-10 items-center gap-2 rounded-lg border border-border bg-background pl-3 pr-1.5">
        <span className="flex-1 truncate text-sm text-muted-foreground">Preguntá sobre tus fuentes</span>
        <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <SendHorizontal aria-hidden className="size-3.5" strokeWidth={1.5} />
        </span>
      </div>
    </div>
  );
}
