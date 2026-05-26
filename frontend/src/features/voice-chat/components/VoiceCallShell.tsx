import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function VoiceCallShell({ children }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 bg-surface p-8">
      {children}
    </div>
  );
}
