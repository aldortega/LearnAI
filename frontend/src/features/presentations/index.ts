export { presentationsApi } from "./api/presentationsApi";
export { NotebookPresentationsPage } from "./pages/NotebookPresentationsPage";
export { usePresentationsConfig } from "./hooks/usePresentationsConfig";
export { useGeneratePresentation } from "./hooks/useGeneratePresentation";
export { usePresentationsHistory } from "./hooks/usePresentationsHistory";
export { usePresentationDetail } from "./hooks/usePresentationDetail";
export { useDeletePresentation } from "./hooks/useDeletePresentation";
export { useDownloadPresentationPdf } from "./hooks/useDownloadPresentationPdf";
export type {
  PresentationConfigOut,
  PresentationDetailLevel,
  PresentationGenerateRequest,
  PresentationGenerationJobOut,
  PresentationListOut,
  PresentationOut,
  PresentationSlide,
  PresentationSourceRef,
  PresentationStyle,
  PresentationStyleTemplate,
} from "./types/presentations.types";
