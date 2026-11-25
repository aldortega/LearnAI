import type { DemoAskPhase } from "../../types/onboarding.types";
import { DEMO_QUESTION } from "../../utils/demoContent";
import { DemoAnswer } from "../DemoAnswer";
import { DemoComposer } from "../DemoComposer";
import { DemoThinkingDots } from "../DemoThinkingDots";

type Props = {
  typedQuestion: string;
  phase: DemoAskPhase;
  revealedTokens: number;
};

export function AskScene({ typedQuestion, phase, revealedTokens }: Props) {
  const isTyping = phase === "typing";
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="flex min-h-36 flex-col justify-end gap-3">
        {isTyping ? null : (
          <div className="ml-auto max-w-[85%] animate-fade-up rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
            {DEMO_QUESTION}
          </div>
        )}
        {phase === "thinking" ? <DemoThinkingDots /> : null}
        {phase === "streaming" || phase === "done" ? (
          <DemoAnswer revealedTokens={revealedTokens} isStreaming={phase === "streaming"} />
        ) : null}
      </div>
      <DemoComposer value={isTyping ? typedQuestion : ""} isTyping={isTyping} />
    </div>
  );
}
