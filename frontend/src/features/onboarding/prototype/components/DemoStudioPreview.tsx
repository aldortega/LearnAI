// PROTOTYPE — onboarding demo (throwaway).
import type { StudioTool } from "../demoData";
import { DemoMindmap } from "./DemoMindmap";
import { DemoQuickstart } from "./DemoQuickstart";
import { DemoQuiz } from "./DemoQuiz";

type Props = {
  tool: StudioTool;
};

export function DemoStudioPreview({ tool }: Props) {
  if (tool === "quiz") return <DemoQuiz />;
  if (tool === "quickstart") return <DemoQuickstart />;
  return <DemoMindmap />;
}
