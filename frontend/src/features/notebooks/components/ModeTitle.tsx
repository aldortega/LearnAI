import { ChevronDown } from "lucide-react";

import { cn } from "../../../shared/lib/cn";
import { useModeSwitcher } from "../hooks/useModeSwitcher";

type Props = {
  children: string;
  className?: string;
};

const BASE_CLASS = "text-sm font-semibold text-foreground";

export function ModeTitle({ children, className }: Props) {
  const openModeSwitcher = useModeSwitcher();

  if (!openModeSwitcher) {
    return <h2 className={cn(BASE_CLASS, className)}>{children}</h2>;
  }

  return (
    <>
      <h2 className={cn(BASE_CLASS, "hidden md:block", className)}>{children}</h2>
      <button
        type="button"
        onClick={openModeSwitcher}
        aria-haspopup="dialog"
        aria-label={`${children} · cambiar modo de estudio`}
        className={cn(
          "-ml-2 flex min-w-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-muted md:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <h2 className={cn(BASE_CLASS, "truncate", className)}>{children}</h2>
        <ChevronDown className="h-4 w-4 flex-none text-muted-foreground" aria-hidden="true" />
      </button>
    </>
  );
}
