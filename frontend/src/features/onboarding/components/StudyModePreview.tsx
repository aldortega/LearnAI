import type { DemoStudyMode } from "../types/onboarding.types";
import { DemoMindmap } from "./DemoMindmap";
import { DemoQuickstart } from "./DemoQuickstart";
import { DemoQuiz } from "./DemoQuiz";

type Props = {
  tool: DemoStudyMode;
};

export function StudyModePreview({ tool }: Props) {
  if (tool === "quiz") return <DemoQuiz />;
  if (tool === "quickstart") return <DemoQuickstart />;
  return <DemoMindmap />;
}
