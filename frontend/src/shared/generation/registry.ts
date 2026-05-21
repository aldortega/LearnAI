import { audioApi } from "../../features/audio/api/audioApi";
import { flashcardsApi } from "../../features/flashcards/api/flashcardsApi";
import { mindmapApi } from "../../features/mindmap/api/mindmapApi";
import { presentationsApi } from "../../features/presentations/api/presentationsApi";
import { quickstartApi } from "../../features/quickstart/api/quickstartApi";
import { quizApi } from "../../features/quiz/api/quizApi";
import { reportsApi } from "../../features/reports/api/reportsApi";
import type { GenerationJobBase, GenerationKind } from "./types";

type StatusFetcher = (
  notebookId: string,
  jobId: string,
) => Promise<GenerationJobBase>;

const registry: Record<GenerationKind, StatusFetcher> = {
  quickstart: quickstartApi.getGenerationStatus,
  quiz_roadmap: quizApi.getGenerationStatus,
  mindmap: mindmapApi.getGenerationStatus,
  flashcards: flashcardsApi.getGenerationStatus,
  presentations: presentationsApi.getGenerationStatus,
  reports: reportsApi.getGenerationStatus,
  audio: audioApi.getGenerationStatus,
};

export function getGenerationStatusFetcher(kind: GenerationKind): StatusFetcher {
  return registry[kind];
}

export const generationKindLabels: Record<GenerationKind, string> = {
  quickstart: "quickstart",
  quiz_roadmap: "quiz",
  mindmap: "mapa mental",
  flashcards: "flashcards",
  presentations: "presentacion",
  reports: "informe",
  audio: "podcast",
};
