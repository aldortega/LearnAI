const DESCRIPTION =
  "Respuesta basada en conocimiento general, no en tus fuentes.";

export function GeneralKnowledgeChip() {
  return (
    <span className="group relative mx-0.5 inline-block align-middle align-middle">
      <button
        type="button"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-600 transition-colors hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 dark:text-amber-400"
        aria-label={DESCRIPTION}
      >
        !
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-56 rounded-xl border border-border bg-surface p-2 text-left text-xs font-normal leading-relaxed text-foreground shadow-xl group-focus-within:block group-hover:block"
      >
        {DESCRIPTION}
      </span>
    </span>
  );
}
