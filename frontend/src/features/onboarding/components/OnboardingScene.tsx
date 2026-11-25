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
      return <CreateNotebookScene typedName={demo.typedNotebookName} isCreated={demo.isNotebookCreated} />;
    case "upload":
      return <UploadSourceScene status={demo.sourceStatus} progress={demo.sourceProgress} />;
    case "ask":
      return (
        <AskScene typedQuestion={demo.typedQuestion} phase={demo.askPhase} revealedTokens={demo.revealedTokens} />
      );
    case "citations":
      return <CitationsScene />;
    case "study-modes":
      return <StudyModesScene activeMode={demo.studyMode} onSelectMode={demo.selectStudyMode} />;
    case "done":
      return <DoneScene />;
  }
}
