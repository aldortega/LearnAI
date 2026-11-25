import type { CitableSource } from "../../../shared/lib/citations";
import type { DemoAnswerSegment, DemoStudyMode } from "../types/onboarding.types";

export const DEMO_NOTEBOOK = {
  name: "Sistemas operativos",
  emoji: "💻",
};

export const DEMO_SOURCE_FILE = "apunte_sistemas_operativos.pdf";

export const DEMO_QUESTION = "¿Cuál es la diferencia entre un proceso y un hilo?";

export const DEMO_CITATION: CitableSource = {
  index: 1,
  file_name: DEMO_SOURCE_FILE,
  page: 8,
  snippet:
    "Un proceso es un programa en ejecución con su propio espacio de direcciones. Los hilos de un mismo proceso comparten ese espacio de memoria y sus recursos, pero cada uno tiene su propia pila y contador de programa.",
};

export const DEMO_ANSWER: DemoAnswerSegment[] = [
  { kind: "text", text: "Un proceso es un programa en ejecución con su propio espacio de memoria, mientras que los hilos de un mismo proceso comparten esa memoria y sus recursos, aunque cada uno tiene su propia pila " },
  { kind: "cite", index: 1 },
  { kind: "text", text: ". Por eso crear y alternar entre hilos suele ser más liviano que hacerlo entre procesos " },
  { kind: "general" },
  { kind: "text", text: "." },
];

export const DEMO_QUICKSTART = {
  summary:
    "Tus apuntes explican cómo el sistema operativo ejecuta programas como procesos e hilos, y cómo decide cuál usa la CPU en cada momento.",
  topics: [
    { emoji: "⚙️", title: "Procesos", keyPoints: ["Programa en ejecución", "Espacio de memoria propio", "Estados: listo, ejecutando, bloqueado"] },
    { emoji: "🧵", title: "Hilos", keyPoints: ["Comparten la memoria del proceso", "Cada uno con su propia pila", "Más livianos de crear"] },
    { emoji: "⏱️", title: "Planificación", keyPoints: ["Decide quién usa la CPU", "FIFO, SJF y Round Robin", "Cambio de contexto"] },
  ],
};

export const DEMO_QUIZ = {
  question: "¿Qué comparten los hilos de un mismo proceso?",
  options: ["La pila", "El espacio de memoria", "El contador de programa", "Los registros de la CPU"],
  correctIndex: 1,
  explanation: "Los hilos comparten el espacio de memoria del proceso, pero cada uno tiene su propia pila y contador de programa.",
};

export const DEMO_MINDMAP = {
  root: "Procesos",
  branches: [
    { label: "Estados", children: ["Listo", "Ejecutando", "Bloqueado"] },
    { label: "Planificación", children: ["FIFO", "SJF", "Round Robin"] },
  ],
};

export const DEMO_STUDY_MODES: { key: DemoStudyMode; label: string; description: string }[] = [
  { key: "quickstart", label: "Inicio rápido", description: "Los temas clave de un vistazo" },
  { key: "quiz", label: "Quiz", description: "Preguntas para evaluarte" },
  { key: "mindmap", label: "Mapa mental", description: "Visión general del tema" },
];

export type MoreStudyModeKey = "flashcards" | "reports" | "presentations" | "audio" | "voice";

export const MORE_STUDY_MODES: { key: MoreStudyModeKey; label: string; description: string }[] = [
  { key: "flashcards", label: "Flashcards", description: "Tarjetas de pregunta y respuesta para repasar con memoria activa." },
  { key: "reports", label: "Informes", description: "Documentos estructurados (resúmenes, guías de estudio) generados a partir de tus fuentes." },
  { key: "presentations", label: "Presentaciones", description: "Diapositivas listas para repasar o exponer el tema." },
  { key: "audio", label: "Audios", description: "Escuchá tus apuntes como un podcast mientras hacés otras cosas." },
  { key: "voice", label: "Voz", description: "Conversá por voz con la IA sobre tus documentos." },
];

export const DEMO_QUESTION_CHARS = Array.from(DEMO_QUESTION);

export const DEMO_ANSWER_TOKENS: DemoAnswerSegment[] = DEMO_ANSWER.flatMap((segment) =>
  segment.kind === "text"
    ? (segment.text.match(/\S+\s*|\s+/g) ?? []).map((text): DemoAnswerSegment => ({ kind: "text", text }))
    : [segment],
);
