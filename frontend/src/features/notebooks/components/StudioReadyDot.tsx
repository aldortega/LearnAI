export function StudioReadyDot() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-1 top-1 flex h-2.5 w-2.5 animate-pop-in motion-reduce:animate-none"
    >
      <span className="absolute inset-0 rounded-full bg-primary animate-ready-ring motion-reduce:hidden" />
      <span className="relative h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-muted" />
    </span>
  );
}
