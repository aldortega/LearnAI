import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type Props = {
  illustration: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  illustration,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-sm flex-col items-center px-4 py-6 text-center",
        className,
      )}
    >
      <div className="w-44 sm:w-52 [&>svg]:h-auto [&>svg]:w-full">{illustration}</div>
      <h3 className="mt-2 text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
