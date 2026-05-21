import { useGenerationJob } from "../../../shared/hooks/useGenerationJob";
import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { audioApi } from "../api/audioApi";
import type {
  AudioGenerateRequest,
  AudioGenerationJobOut,
} from "../types/audio.types";

type Result = {
  generate: (
    payload: AudioGenerateRequest,
  ) => Promise<AudioGenerationJobOut | null>;
  resumeLatest: (options?: {
    suppressFailedError?: boolean;
  }) => Promise<AudioGenerationJobOut | null>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
};

export function useGenerateAudio(notebookId?: string): Result {
  return useGenerationJob<AudioGenerateRequest, AudioGenerationJobOut>({
    notebookId,
    kind: "audio",
    generateRequest: audioApi.generate,
    getLatestRequest: async (id) => audioApi.getLatestGeneration(id),
    defaultFailedError: "No se pudo generar el podcast.",
    toErrorMessage: toNotebookErrorMessage,
  });
}
