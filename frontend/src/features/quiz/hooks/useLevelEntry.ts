import { useCallback, useEffect, useState } from "react";

import { toNotebookErrorMessage } from "../../notebooks/utils/notebookErrors";
import { quizApi } from "../api/quizApi";
import type { RoadmapOut } from "../types/quiz.types";

const GENERATION_FAILED_MESSAGE =
  "No se pudieron generar las preguntas. Intentá de nuevo.";

type Params = {
  notebookId?: string;
  roadmap: RoadmapOut | null;
  reloadRoadmap: () => Promise<RoadmapOut | null>;
  onEnter: (levelId: string) => void;
};

type Result = {
  preparingLevelId: string | null;
  error: string | null;
  selectLevel: (levelId: string) => void;
};

type Preparing = {
  levelId: string;
  isWatching: boolean;
};

function findQuestionsStatus(roadmap: RoadmapOut | null, levelId: string) {
  for (const unit of roadmap?.units ?? []) {
    const level = unit.levels.find((item) => item.id === levelId);
    if (level) return level.questions_status ?? "idle";
  }
  return null;
}

export function useLevelEntry({
  notebookId,
  roadmap,
  reloadRoadmap,
  onEnter,
}: Params): Result {
  const [preparing, setPreparing] = useState<Preparing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectLevel = useCallback(
    (levelId: string) => {
      if (!notebookId) return;

      if (findQuestionsStatus(roadmap, levelId) === "ready") {
        setError(null);
        onEnter(levelId);
        return;
      }

      setError(null);
      setPreparing({ levelId, isWatching: false });

      void (async () => {
        try {
          await quizApi.generateLevelQuestions(notebookId, levelId);
          await reloadRoadmap();
          setPreparing({ levelId, isWatching: true });
        } catch (e) {
          setPreparing(null);
          setError(toNotebookErrorMessage(e));
        }
      })();
    },
    [notebookId, roadmap, reloadRoadmap, onEnter],
  );

  useEffect(() => {
    if (!preparing?.isWatching) return;

    const status = findQuestionsStatus(roadmap, preparing.levelId);
    if (status === "ready") {
      onEnter(preparing.levelId);
      queueMicrotask(() => setPreparing(null));
    } else if (status === "failed") {
      queueMicrotask(() => {
        setPreparing(null);
        setError(GENERATION_FAILED_MESSAGE);
      });
    }
  }, [preparing, roadmap, onEnter]);

  return {
    preparingLevelId: preparing?.levelId ?? null,
    error,
    selectLevel,
  };
}
