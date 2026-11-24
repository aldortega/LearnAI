// PROTOTYPE — Variante A: tour con spotlight sobre una maqueta de la app. El usuario hace cada acción.
import { CoachCard } from "./components/CoachCard";
import { SpotlightMockApp } from "./components/SpotlightMockApp";
import type { DemoFlow, DemoStep } from "./useDemoFlow";

type Props = {
  flow: DemoFlow;
  onClose: () => void;
};

const FOCUS: Record<DemoStep, "create" | "upload" | "ask" | "citations" | "studio" | null> = {
  welcome: null,
  create: "create",
  upload: "upload",
  ask: "ask",
  citations: "citations",
  studio: "studio",
  done: null,
};

const HINTS: Partial<Record<DemoStep, string>> = {
  create: "Haz clic en «Nuevo cuaderno» y luego en «Crear».",
  upload: "Haz clic en la zona resaltada para usar el archivo de ejemplo.",
  ask: "Pulsa el botón de enviar para hacer la pregunta.",
  citations: "Pasa el cursor por el número [1] de la respuesta.",
  studio: "Elige una herramienta para ver qué genera.",
};

function canContinue(flow: DemoFlow): boolean {
  switch (flow.step) {
    case "create": return flow.isNotebookCreated;
    case "upload": return flow.sourceStatus === "done";
    case "ask": return flow.isAnswerComplete;
    case "citations": return flow.hasSeenCitation;
    case "studio": return flow.studioTool !== null;
    default: return true;
  }
}

export function VariantASpotlight({ flow, onClose }: Props) {
  const isModalStep = flow.step === "welcome" || flow.step === "done";

  return (
    <div className="fixed inset-0 z-50">
      <SpotlightMockApp flow={flow} focus={FOCUS[flow.step]} />
      {isModalStep ? <div className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm" /> : null}
      <CoachCard flow={flow} canContinue={canContinue(flow)} hint={HINTS[flow.step]} centered={isModalStep} onFinish={onClose} />
    </div>
  );
}
