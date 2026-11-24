import { UploadCloud } from "lucide-react";

import type { DemoSourceStatus } from "../../types/onboarding.types";
import { DemoSourceItem } from "../DemoSourceItem";

type Props = {
  status: DemoSourceStatus;
};

export function UploadSourceScene({ status }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <div className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border-strong bg-surface p-4 text-xs text-muted-foreground">
        <UploadCloud className="h-6 w-6 text-primary" /> PDF · DOCX · TXT
      </div>
      {status !== "none" ? <DemoSourceItem status={status} /> : null}
    </div>
  );
}
