import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

import { Button } from "../../../shared/ui/Button";
import { useOnboardingDemo } from "../hooks/useOnboardingDemo";
import { STEP_COPY } from "../utils/onboardingSteps";
import { OnboardingScene } from "./OnboardingScene";
import { OnboardingStepDots } from "./OnboardingStepDots";

type Props = {
  onClose: () => void;
  onFinish: () => void;
};

function getPrimaryLabel(isFirstStep: boolean, isLastStep: boolean): string {
  if (isFirstStep) return "Ver cómo funciona";
  if (isLastStep) return "Crear mi primer cuaderno";
  return "Siguiente";
}

export function OnboardingCarousel({ onClose, onFinish }: Props) {
  const demo = useOnboardingDemo();
  const titleId = useId();
  const descriptionId = useId();
  const copy = STEP_COPY[demo.step];

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-border">
        <div key={demo.step} className="flex min-h-64 flex-1 items-center justify-center overflow-y-auto bg-muted px-4 py-8 sm:min-h-80 sm:px-6">
          <OnboardingScene demo={demo} />
        </div>
        <div className="flex flex-none flex-col gap-4 p-4 sm:p-6">
          <div key={demo.step} className="animate-fade-up">
            <h2 id={titleId} className="text-xl font-bold text-foreground">{copy.title}</h2>
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
          </div>
          <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
            <OnboardingStepDots total={demo.totalSteps} current={demo.stepIndex} onSelect={demo.goTo} />
            <div className="flex w-full justify-end gap-2 sm:w-auto">
              {demo.isFirstStep ? <Button variant="ghost" onClick={onClose}>Saltar</Button> : null}
              {!demo.isFirstStep && !demo.isLastStep ? <Button variant="ghost" onClick={demo.back}>Atrás</Button> : null}
              <Button onClick={demo.isLastStep ? onFinish : demo.next}>
                {getPrimaryLabel(demo.isFirstStep, demo.isLastStep)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
