import type { OnboardingStep, StepCopy } from "../types/onboarding.types";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  "welcome",
  "create",
  "upload",
  "ask",
  "citations",
  "study-modes",
  "done",
];

export const STEP_COPY: Record<OnboardingStep, StepCopy> = {
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
    body: "Arrastrá PDFs, DOCX, PPTX o TXT. LearnAI los procesa e indexa para que la IA responda solo con tu contenido.",
  },
  ask: {
    title: "3. Preguntá lo que quieras",
    body: "Hacé preguntas en lenguaje natural sobre tus documentos. Las respuestas se basan en tus fuentes.",
  },
  citations: {
    title: "4. Verificá con citas",
    body: "Cada afirmación lleva una cita: pasá el cursor por los números para ver el fragmento exacto y la página. Si la IA completa con conocimiento general, lo marca con un «!» para que sepas que no viene de tus fuentes.",
  },
  "study-modes": {
    title: "5. Elegí tu modo de estudio",
    body: "Con tus fuentes listas, LearnAI genera material para estudiar a tu manera. Probá alguno de los modos de estudio.",
  },
  done: {
    title: "¡Listo para empezar!",
    body: "Además del inicio rápido, el quiz y el mapa mental, tenés más modos de estudio esperándote. Creá tu primer cuaderno y subí tus apuntes.",
  },
};
