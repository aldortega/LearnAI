import type { ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";

type Props = {
  children: ReactNode;
  headerAction?: ReactNode;
};

export function PresentationsShell({ children, headerAction }: Props) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <ModeTitle>Presentaciones</ModeTitle>
        {headerAction}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
