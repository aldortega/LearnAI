import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  headerAction?: ReactNode;
};

export function AudioShell({ children, headerAction }: Props) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Audios</h2>
        {headerAction}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
