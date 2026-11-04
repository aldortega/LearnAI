import { PreviewChat } from "./PreviewChat";
import { PreviewSourcePage } from "./PreviewSourcePage";

export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="flex h-10 items-center gap-2 border-b border-border px-4">
        <span aria-hidden className="size-2.5 rounded-full bg-border-strong" />
        <span aria-hidden className="size-2.5 rounded-full bg-border-strong" />
        <span aria-hidden className="size-2.5 rounded-full bg-border-strong" />
        <span className="ml-2 truncate font-mono text-xs text-muted-foreground">
          uselearnai.tech/notebook/biologia
        </span>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,1fr)_240px]">
        <PreviewChat />
        <PreviewSourcePage />
      </div>
    </div>
  );
}
