import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

type Result = {
  goChat: () => void;
  goQuiz: () => void;
  goQuickstart: () => void;
  goReports: () => void;
  goPresentations: () => void;
  goMindmap: () => void;
  goFlashcards: () => void;
  goAudio: () => void;
  goVoice: () => void;
};

export function useVoiceStudioNav(notebookId?: string): Result {
  const navigate = useNavigate();

  const goChat = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/chat`);
  }, [notebookId, navigate]);
  const goQuiz = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quiz`);
  }, [notebookId, navigate]);
  const goQuickstart = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/quickstart`);
  }, [notebookId, navigate]);
  const goReports = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/reports`);
  }, [notebookId, navigate]);
  const goPresentations = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/presentations`);
  }, [notebookId, navigate]);
  const goMindmap = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/mindmap`);
  }, [notebookId, navigate]);
  const goFlashcards = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/flashcards`);
  }, [notebookId, navigate]);
  const goAudio = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/audio`);
  }, [notebookId, navigate]);
  const goVoice = useCallback(() => {
    if (!notebookId) return;
    navigate(`/notebook/${notebookId}/voice`);
  }, [notebookId, navigate]);

  return {
    goChat,
    goQuiz,
    goQuickstart,
    goReports,
    goPresentations,
    goMindmap,
    goFlashcards,
    goAudio,
    goVoice,
  };
}
