import { useEffect, useState } from "react";

import type { DemoAskPhase } from "../types/onboarding.types";
import { DEMO_ANSWER_TOKENS, DEMO_QUESTION_CHARS } from "../utils/demoContent";

const TYPE_START_DELAY_MS = 400;
const TYPE_CHAR_MS = 32;
const SEND_DELAY_MS = 350;
const THINKING_MS = 1100;
const TOKEN_MS = 55;

export type AskDemo = {
  typedQuestion: string;
  phase: DemoAskPhase;
  revealedTokens: number;
};

export function useAskDemo(isActive: boolean): AskDemo {
  const [typedChars, setTypedChars] = useState(0);
  const [phase, setPhase] = useState<DemoAskPhase>("typing");
  const [revealedTokens, setRevealedTokens] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    let delay: number | null = null;
    let advance: () => void = () => {};

    if (phase === "typing" && typedChars < DEMO_QUESTION_CHARS.length) {
      delay = typedChars === 0 ? TYPE_START_DELAY_MS : TYPE_CHAR_MS;
      advance = () => setTypedChars((count) => count + 1);
    } else if (phase === "typing") {
      delay = SEND_DELAY_MS;
      advance = () => setPhase("thinking");
    } else if (phase === "thinking") {
      delay = THINKING_MS;
      advance = () => setPhase("streaming");
    } else if (phase === "streaming" && revealedTokens < DEMO_ANSWER_TOKENS.length) {
      delay = TOKEN_MS;
      advance = () => setRevealedTokens((count) => count + 1);
    } else if (phase === "streaming") {
      delay = 0;
      advance = () => setPhase("done");
    }

    if (delay === null) return;
    const timer = window.setTimeout(advance, delay);
    return () => window.clearTimeout(timer);
  }, [isActive, phase, typedChars, revealedTokens]);

  return {
    typedQuestion: DEMO_QUESTION_CHARS.slice(0, typedChars).join(""),
    phase,
    revealedTokens,
  };
}
