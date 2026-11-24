import type { OnboardingDemo } from "../hooks/useOnboardingDemo";
import { AskScene } from "./scenes/AskScene";
import { CitationsScene } from "./scenes/CitationsScene";
import { CreateNotebookScene } from "./scenes/CreateNotebookScene";
import { DoneScene } from "./scenes/DoneScene";
import { StudyModesScene } from "./scenes/StudyModesScene";
import { UploadSourceScene } from "./scenes/UploadSourceScene";
import { WelcomeScene } from "./scenes/WelcomeScene";

type Props = {
  demo: OnboardingDemo;
};

export function OnboardingScene({ demo }: Props) {
  switch (demo.step) {
    case "welcome":
      return <WelcomeScene />;
    case "create":
      return <CreateNotebookScene isCreated={demo.isNotebookCreated} />;
    case "upload":
      return <UploadSourceScene status={demo.sourceStatus} />;
    case "ask":
      return <AskScene isQuestionAsked={demo.isQuestionAsked} revealedSegments={demo.revealedSegments} />;
    case "citations":
      return <CitationsScene />;
    case "study-modes":
      return <StudyModesScene activeMode={demo.studyMode} onSelectMode={demo.selectStudyMode} />;
    case "done":
      return <DoneScene />;
  }
}
