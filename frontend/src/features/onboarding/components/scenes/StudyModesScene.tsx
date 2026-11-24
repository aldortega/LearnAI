import type { DemoStudyMode } from "../../types/onboarding.types";
import { StudyModePicker } from "../StudyModePicker";
import { StudyModePreview } from "../StudyModePreview";

type Props = {
  activeMode: DemoStudyMode | null;
  onSelectMode: (mode: DemoStudyMode) => void;
};

export function StudyModesScene({ activeMode, onSelectMode }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <StudyModePicker active={activeMode} onPick={onSelectMode} />
      {activeMode ? (
        <div key={activeMode} className="animate-fade-up rounded-xl border border-border bg-surface p-4">
          <StudyModePreview tool={activeMode} />
        </div>
      ) : null}
    </div>
  );
}
