import { DNA_SOURCE, MITOCHONDRIA_SOURCE, PREVIEW_PAGE } from "../utils/previewContent";
import { CitationMark } from "./CitationMark";

export function PreviewSourcePage() {
  return (
    <aside
      aria-label="Fragmento citado"
      className="hidden flex-col gap-4 border-l border-border bg-background p-4 sm:flex"
    >
      <div className="flex items-start gap-2">
        <CitationMark label={1} />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{MITOCHONDRIA_SOURCE.file_name}</p>
          <p className="font-mono text-xs text-muted-foreground">Página {MITOCHONDRIA_SOURCE.page}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <p className="font-mono text-xs text-muted-foreground">{PREVIEW_PAGE.chapter}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {PREVIEW_PAGE.before}{" "}
          <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground [box-decoration-break:clone]">
            {MITOCHONDRIA_SOURCE.snippet}
          </mark>{" "}
          {PREVIEW_PAGE.after}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
        <CitationMark label={2} />
        <p className="truncate text-xs text-muted-foreground">{DNA_SOURCE.file_name}</p>
      </div>
    </aside>
  );
}
