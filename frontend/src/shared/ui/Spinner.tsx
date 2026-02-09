import { cn } from "../lib/cn";

type Props = {
  className?: string;
};

export function Spinner({ className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current",
        className,
      )}
    />
  );
}
