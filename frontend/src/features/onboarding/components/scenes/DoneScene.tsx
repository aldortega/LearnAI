import { PartyPopper } from "lucide-react";

import { MoreStudyModes } from "../MoreStudyModes";

export function DoneScene() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
      <span className="grid h-14 w-14 animate-fade-up place-items-center rounded-full bg-primary/10 text-primary">
        <PartyPopper className="h-7 w-7" />
      </span>
      <MoreStudyModes />
    </div>
  );
}
