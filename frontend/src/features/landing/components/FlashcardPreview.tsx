import { PREVIEW_FLASHCARD } from "../utils/previewContent";

export function FlashcardPreview() {
  return (
    <div aria-hidden className="relative mx-auto mt-auto w-full max-w-sm pb-2">
      <div className="absolute inset-x-4 bottom-0 top-4 rounded-xl border border-border bg-muted" />
      <div className="relative flex aspect-[4/3] flex-col justify-between rounded-xl border border-border bg-background p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <p className="text-right font-mono text-xs text-muted-foreground">{PREVIEW_FLASHCARD.progress}</p>
        <div>
          <p className="text-xl font-medium text-foreground">{PREVIEW_FLASHCARD.front}</p>
          <p className="mt-1 text-sm text-muted-foreground">{PREVIEW_FLASHCARD.hint}</p>
        </div>
      </div>
    </div>
  );
}
