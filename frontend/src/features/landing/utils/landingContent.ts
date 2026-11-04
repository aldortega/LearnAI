import {
  BookOpenCheck,
  Compass,
  FileText,
  Headphones,
  Layers,
  LockKeyhole,
  MessageSquareQuote,
  Mic,
  Network,
  Presentation,
  Quote,
  type LucideIcon,
} from "lucide-react";

export type LandingFeaturePreview = "quiz" | "flashcard";

export type LandingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  preview?: LandingFeaturePreview;
};

export type LandingStep = {
  title: string;
  description: string;
};

export type LandingTrustItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type LandingRole = {
  name: string;
  description: string;
};

export type LandingFaq = {
  question: string;
  answer: string;
};

export const LANDING_NAV_LINKS = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Herramientas", href: "#herramientas" },
  { label: "Preguntas", href: "#preguntas" },
] as const;

export const LANDING_STEPS: LandingStep[] = [
  {
    title: "Subí tus materiales",
    description:
      "Cargá apuntes, libros, papers o presentaciones en PDF, DOCX, PPTX o TXT. LearnAI los procesa y los convierte en tu base de conocimiento.",
  },
  {
    title: "Preguntá lo que quieras",
    description:
      "Conversá con tus documentos. Cada respuesta indica de qué parte de tus fuentes sale, para que puedas verificarla.",
  },
  {
    title: "Practicá y repasá",
    description:
      "Generá quizzes, flashcards, mapas mentales y más a partir del mismo contenido para fijar lo aprendido.",
  },
];

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: "Chat con citas",
    description:
      "Respuestas basadas exclusivamente en tus documentos, con referencias a la fuente original en cada afirmación.",
    icon: MessageSquareQuote,
  },
  {
    title: "Inicio rápido",
    description:
      "Obtené un panorama de tus fuentes y los temas principales, cada uno con sus puntos clave.",
    icon: Compass,
  },
  {
    title: "Quizzes",
    description: "Evaluá lo que sabés con preguntas generadas sobre tu material.",
    icon: BookOpenCheck,
    preview: "quiz",
  },
  {
    title: "Flashcards",
    description: "Repasá conceptos clave con tarjetas listas para estudiar.",
    icon: Layers,
    preview: "flashcard",
  },
  {
    title: "Mapas mentales",
    description: "Visualizá cómo se conectan las ideas principales de un tema.",
    icon: Network,
  },
  {
    title: "Presentaciones",
    description: "Convertí tus fuentes en diapositivas para exponer o resumir.",
    icon: Presentation,
  },
  {
    title: "Audios",
    description: "Escuchá un resumen de tus materiales mientras viajás o entrenás.",
    icon: Headphones,
  },
  {
    title: "Chat por voz",
    description: "Practicá en voz alta y conversá con tus apuntes como con un tutor.",
    icon: Mic,
  },
  {
    title: "Informes",
    description: "Obtené documentos estructurados que sintetizan un tema completo.",
    icon: FileText,
  },
];

export const LANDING_TRUST_ITEMS: LandingTrustItem[] = [
  {
    title: "Siempre con fuente",
    description:
      "Las respuestas se construyen a partir de tus documentos y muestran la cita para que verifiques cada dato.",
    icon: Quote,
  },
  {
    title: "Tus materiales son tuyos",
    description:
      "Cada cuaderno es privado: solo vos y las personas que invites acceden a los documentos y al contenido que generás.",
    icon: LockKeyhole,
  },
  {
    title: "Formatos de siempre",
    description: "Trabajá con los archivos que ya tenés: PDF, DOCX, PPTX y TXT, sin convertir nada.",
    icon: FileText,
  },
];

export const LANDING_ROLES: LandingRole[] = [
  { name: "Propietario", description: "Invita personas y decide qué puede hacer cada una" },
  { name: "Editor", description: "Suma y quita fuentes del cuaderno" },
  { name: "Lector", description: "Estudia con las mismas fuentes: chat, quizzes, flashcards y más" },
];

export const LANDING_FAQS: LandingFaq[] = [
  {
    question: "¿Qué archivos puedo subir?",
    answer:
      "PDF, DOCX, PPTX y TXT. Una vez procesados, quedan en tu cuaderno para chatear y generar material de estudio.",
  },
  {
    question: "¿Por dónde empiezo si tengo mucho material?",
    answer:
      "Con Inicio rápido: LearnAI te da un panorama de tus fuentes y los temas principales, cada uno con sus puntos clave, para que sepas qué estudiar primero.",
  },
  {
    question: "¿En qué se diferencia de un chat de IA común?",
    answer:
      "Responde a partir de las fuentes que cargás y cita el fragmento exacto de donde sale cada respuesta. Estudiás tu temario, no información genérica.",
  },
  {
    question: "¿Qué pasa si la respuesta no está en mis documentos?",
    answer:
      "Si una parte sale de conocimiento general, LearnAI la marca con un aviso para que sepas que no proviene de tus fuentes.",
  },
  {
    question: "¿Puedo estudiar con otras personas?",
    answer:
      "Sí. Invitás a otras personas a tu cuaderno con su correo y elegís si pueden sumar fuentes o solo estudiar con ellas.",
  },
  {
    question: "¿Quién puede ver mis documentos?",
    answer: "Solo vos y las personas que invites a cada cuaderno.",
  },
  {
    question: "¿Puedo borrar mis documentos?",
    answer:
      "Sí. Podés eliminar cualquier fuente o cuaderno cuando quieras, y deja de usarse en tus respuestas.",
  },
];
