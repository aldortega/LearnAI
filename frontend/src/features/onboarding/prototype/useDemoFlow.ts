// PROTOTYPE — onboarding demo (throwaway). Máquina de estados simulada en memoria.
import { useCallback, useEffect, useRef, useState } from "react";

import { DEMO_ANSWER, type StudioTool } from "./demoData";

export const DEMO_STEPS = ["welcome", "create", "upload", "ask", "citations", "studio", "done"] as const;
export type DemoStep = (typeof DEMO_STEPS)[number];

export const STEP_COPY: Record<DemoStep, { title: string; body: string }> = {
  welcome: {
    title: "Bienvenido a LearnAI",
    body: "Estudiá cualquier tema a partir de tus propios apuntes. Te mostramos cómo funciona en menos de un minuto con un ejemplo.",
  },
  create: {
    title: "1. Creá un cuaderno",
    body: "Un cuaderno agrupa todo lo que estudiás sobre un tema: tus fuentes, el chat y el material generado.",
  },
  upload: {
    title: "2. Subí tus fuentes",
    body: "Arrastrá PDFs, DOCX o TXT. LearnAI los procesa e indexa para que la IA responda solo con tu contenido.",
  },
  ask: {
    title: "3. Preguntá lo que quieras",
    body: "Hacé preguntas en lenguaje natural sobre tus documentos. Las respuestas se basan en tus fuentes.",
  },
  citations: {
    title: "4. Verificá con citas",
    body: "Cada afirmación lleva una cita: pasá el cursor por los números para ver el fragmento exacto y la página. Si la IA completa con conocimiento general, lo marca con un «!» para que sepas que no viene de tus fuentes.",
  },
  studio: {
    title: "5. Elegí tu modo de estudio",
    body: "Con tus fuentes listas, LearnAI genera material para estudiar a tu manera. Probá alguno de los modos de estudio.",
  },
  done: {
    title: "¡Listo para empezar!",
    body: "Además del inicio rápido, el quiz y el mapa mental, tenés más modos de estudio esperándote. Creá tu primer cuaderno y subí tus apuntes.",
  },
};

export type SourceStatus = "none" | "processing" | "done";

const PROCESSING_MS = 2200;
const SEGMENT_MS = 450;

export function useDemoFlow() {
  const [stepIndex, setStepIndex] = useState(0);
  const [notebookName, setNotebookName] = useState("");
  const [isNotebookCreated, setIsNotebookCreated] = useState(false);
  const [sourceStatus, setSourceStatus] = useState<SourceStatus>("none");
  const [isQuestionAsked, setIsQuestionAsked] = useState(false);
  const [revealedSegments, setRevealedSegments] = useState(0);
  const [hasSeenCitation, setHasSeenCitation] = useState(false);
  const [studioTool, setStudioTool] = useState<StudioTool | null>(null);
  const timersRef = useRef<number[]>([]);

  const step = DEMO_STEPS[stepIndex];

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (!isQuestionAsked || revealedSegments >= DEMO_ANSWER.length) return;
    const id = window.setTimeout(() => setRevealedSegments((n) => n + 1), SEGMENT_MS);
    return () => window.clearTimeout(id);
  }, [isQuestionAsked, revealedSegments]);

  const goTo = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(DEMO_STEPS.length - 1, index)));
  }, []);
  const next = useCallback(() => setStepIndex((i) => Math.min(DEMO_STEPS.length - 1, i + 1)), []);
  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  const createNotebook = useCallback((name: string) => {
    setNotebookName(name);
    setIsNotebookCreated(true);
  }, []);

  const uploadSource = useCallback(() => {
    setSourceStatus("processing");
    timersRef.current.push(window.setTimeout(() => setSourceStatus("done"), PROCESSING_MS));
  }, []);

  const ask = useCallback(() => {
    setIsQuestionAsked(true);
    setRevealedSegments(1);
  }, []);

  const restart = useCallback(() => {
    setStepIndex(0);
    setNotebookName("");
    setIsNotebookCreated(false);
    setSourceStatus("none");
    setIsQuestionAsked(false);
    setRevealedSegments(0);
    setHasSeenCitation(false);
    setStudioTool(null);
  }, []);

  return {
    step,
    stepIndex,
    totalSteps: DEMO_STEPS.length,
    notebookName,
    isNotebookCreated,
    sourceStatus,
    isQuestionAsked,
    revealedSegments,
    isAnswerComplete: revealedSegments >= DEMO_ANSWER.length,
    hasSeenCitation,
    studioTool,
    next,
    back,
    goTo,
    createNotebook,
    uploadSource,
    ask,
    markCitationSeen: () => setHasSeenCitation(true),
    openTool: setStudioTool,
    restart,
  };
}

export type DemoFlow = ReturnType<typeof useDemoFlow>;
