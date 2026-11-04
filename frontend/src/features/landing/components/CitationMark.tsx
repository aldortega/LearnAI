type Props = {
  label: number;
};

export function CitationMark({ label }: Props) {
  return (
    <span
      aria-hidden
      className="inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary/10 px-1.5 text-xs font-medium tabular-nums text-primary"
    >
      {label}
    </span>
  );
}
