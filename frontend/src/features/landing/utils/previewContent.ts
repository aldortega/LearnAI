import type { CitableSource } from "../../../shared/lib/citations";

export const PREVIEW_QUESTION = "¿Qué función cumplen las mitocondrias?";

export const MITOCHONDRIA_SOURCE: CitableSource = {
  file_name: "Biología celular.pdf",
  page: 42,
  snippet:
    "Las mitocondrias son orgánulos encargados de la respiración celular, proceso mediante el cual se obtiene ATP a partir de la glucosa.",
};

export const DNA_SOURCE: CitableSource = {
  file_name: "Apuntes clase 4.docx",
  snippet:
    "Poseen ADN propio y se dividen de forma independiente, lo que respalda la teoría endosimbiótica.",
};

export const PREVIEW_PAGE = {
  chapter: "Capítulo 3 · Orgánulos",
  before:
    "En las células eucariotas, la energía química se obtiene en distintos compartimentos.",
  after: "Su número varía según la demanda energética de cada tejido.",
};

export const PREVIEW_QUIZ = {
  progress: "Pregunta 3 de 10",
  question: "¿Dónde ocurre la respiración celular?",
  options: ["Núcleo", "Mitocondria", "Ribosoma"],
  correctIndex: 1,
};

export const PREVIEW_FLASHCARD = {
  progress: "12 de 40",
  front: "Teoría endosimbiótica",
  hint: "Origen de las mitocondrias",
};

export const ANATOMY_QUESTION = "¿Por qué se dice que las mitocondrias fueron bacterias?";

export type PreviewMemberRole = "Propietario" | "Editor" | "Lector";

export const PREVIEW_MEMBERS: Array<{ name: string; email: string; role: PreviewMemberRole }> = [
  { name: "Brenda Cano", email: "brenda.cano@ejemplo.com", role: "Propietario" },
  { name: "Marianela Acosta", email: "marianela.acosta@ejemplo.com", role: "Editor" },
  { name: "Abril Zacaria", email: "abril.zacaria@ejemplo.com", role: "Lector" },
];

export const PREVIEW_PENDING_INVITE = "azul.coronel@ejemplo.com";

export const PREVIEW_FILES_SHARED = [
  "Biología celular.pdf",
  "Apuntes clase 4.docx",
  "Resumen mitosis.txt",
];
