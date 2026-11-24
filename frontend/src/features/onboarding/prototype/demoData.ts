// PROTOTYPE — onboarding demo (throwaway). Datos simulados, sin llamadas reales.
import type { CitableSource } from "../../../shared/lib/citations";

export const DEMO_NOTEBOOK = {
  name: "Biología",
  emoji: "🌿",
};

export const DEMO_SOURCE_FILE = "fotosintesis_biologia.pdf";

export const DEMO_QUESTION = "¿Qué ocurre en la fase luminosa de la fotosíntesis?";

export const DEMO_SUGGESTED_QUESTIONS = [
  DEMO_QUESTION,
  "¿Qué es el ciclo de Calvin?",
  "Resumí el capítulo 2",
];

export const DEMO_CITATIONS: CitableSource[] = [
  {
    index: 1,
    file_name: DEMO_SOURCE_FILE,
    page: 12,
    snippet:
      "La fase luminosa tiene lugar en las membranas de los tilacoides. La energía de la luz es captada por la clorofila y se utiliza para romper moléculas de agua (fotólisis), liberando oxígeno.",
  },
  {
    index: 2,
    file_name: DEMO_SOURCE_FILE,
    page: 14,
    snippet:
      "Como resultado de la fase luminosa se generan ATP y NADPH, que serán utilizados posteriormente en la fase oscura o ciclo de Calvin para fijar el CO2.",
  },
];

export type AnswerSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; index: number }
  | { kind: "general" };

export const DEMO_ANSWER: AnswerSegment[] = [
  { kind: "text", text: "En la fase luminosa, la clorofila capta la energía de la luz en las membranas de los tilacoides y la usa para romper moléculas de agua, liberando oxígeno " },
  { kind: "cite", index: 1 },
  { kind: "text", text: ". Gracias a este proceso, las plantas y algas producen la mayor parte del oxígeno que respiramos " },
  { kind: "general" },
  { kind: "text", text: "." },
];

export const DEMO_QUIZ = {
  question: "¿Qué gas se libera durante la fase luminosa?",
  options: ["Dióxido de carbono", "Oxígeno", "Nitrógeno", "Hidrógeno"],
  correctIndex: 1,
  explanation: "La fotólisis del agua libera oxígeno como subproducto.",
  citationIndex: 1,
};

export const DEMO_FLASHCARD = {
  front: "¿Dónde ocurre la fase luminosa?",
  back: "En las membranas de los tilacoides del cloroplasto.",
};

export const DEMO_MINDMAP = {
  root: "Fotosíntesis",
  branches: [
    { label: "Fase luminosa", children: ["Tilacoides", "Fotólisis del agua", "ATP y NADPH"] },
    { label: "Ciclo de Calvin", children: ["Estroma", "Fijación de CO2", "Glucosa"] },
  ],
};

export const DEMO_QUICKSTART = {
  summary:
    "Tus apuntes explican cómo las plantas transforman la luz en energía química, en dos fases que ocurren en distintas partes del cloroplasto.",
  topics: [
    { emoji: "☀️", title: "Fase luminosa", keyPoints: ["Ocurre en los tilacoides", "La luz rompe el agua y libera oxígeno", "Produce ATP y NADPH"] },
    { emoji: "🔄", title: "Ciclo de Calvin", keyPoints: ["Ocurre en el estroma", "Fija el CO2 del aire", "Usa ATP y NADPH para formar glucosa"] },
    { emoji: "🌱", title: "Factores que la afectan", keyPoints: ["Intensidad de la luz", "Concentración de CO2", "Temperatura"] },
  ],
};

export type StudioTool = "quickstart" | "quiz" | "mindmap";

export const STUDIO_TOOLS: { key: StudioTool; label: string; description: string }[] = [
  { key: "quickstart", label: "Inicio rápido", description: "Los temas clave de un vistazo" },
  { key: "quiz", label: "Quiz", description: "Preguntas para evaluarte" },
  { key: "mindmap", label: "Mapa mental", description: "Visión general del tema" },
];

export const MORE_STUDY_MODES: { key: string; label: string; description: string }[] = [
  { key: "flashcards", label: "Flashcards", description: "Tarjetas de pregunta y respuesta para repasar con memoria activa." },
  { key: "reports", label: "Informes", description: "Documentos estructurados (resúmenes, guías de estudio) generados a partir de tus fuentes." },
  { key: "presentations", label: "Presentaciones", description: "Diapositivas listas para repasar o exponer el tema." },
  { key: "audio", label: "Audios", description: "Escuchá tus apuntes como un podcast mientras hacés otras cosas." },
  { key: "voice", label: "Voz", description: "Conversá por voz con la IA sobre tus documentos." },
];
