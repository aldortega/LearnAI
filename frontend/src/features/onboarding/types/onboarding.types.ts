export type OnboardingStep =
  | "welcome"
  | "create"
  | "upload"
  | "ask"
  | "citations"
  | "study-modes"
  | "done";

export type DemoSourceStatus = "none" | "processing" | "done";

export type DemoStudyMode = "quickstart" | "quiz" | "mindmap";

export type DemoAnswerSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; index: number }
  | { kind: "general" };

export type StepCopy = {
  title: string;
  body: string;
};
