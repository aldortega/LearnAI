import type { ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";

type Props = {
  children: ReactNode;
};

export function VoiceCallShell({ children }: Props) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] flex-none items-center border-b border-border px-4 md:hidden">
        <ModeTitle>Voz</ModeTitle>
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-12 p-8">
        {children}
      </div>
    </div>
  );
}
