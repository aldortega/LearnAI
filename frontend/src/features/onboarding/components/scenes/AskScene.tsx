import { DEMO_QUESTION } from "../../utils/demoContent";
import { DemoAnswer } from "../DemoAnswer";

type Props = {
  isQuestionAsked: boolean;
  revealedSegments: number;
};

export function AskScene({ isQuestionAsked, revealedSegments }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="ml-auto max-w-[85%] animate-fade-up rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
        {DEMO_QUESTION}
      </div>
      {isQuestionAsked ? (
        <div className="max-w-[92%] rounded-2xl border border-border bg-surface px-4 py-3">
          <DemoAnswer revealedSegments={revealedSegments} />
        </div>
      ) : null}
    </div>
  );
}
