import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { useQuizAttempts } from "../hooks/useQuizAttempts";
import { useQuizQuestions } from "../hooks/useQuizQuestions";
import { useSubmitQuizAnswer } from "../hooks/useSubmitQuizAnswer";
import type { QuizAttemptOut } from "../types/quiz.types";
import { AnswerFeedback } from "./AnswerFeedback";
import { QuestionView } from "./QuestionView";

type Props = {
  notebookId: string;
  levelId: string;
  levelTitle: string;
  onReloadRoadmap: () => Promise<void>;
};

type QuizFeedback = {
  is_correct: boolean;
  explanation: string;
  correct_option_id: string;
  level_score?: number;
  passed?: boolean;
};

export function QuizArea({
  notebookId,
  levelId,
  levelTitle,
  onReloadRoadmap,
}: Props) {
  const navigate = useNavigate();
  const [questionIndexState, setQuestionIndexState] = useState<{
    levelId: string;
    index: number | null;
  }>({ levelId, index: null });
  const [answerState, setAnswerState] = useState<{
    questionId: string | null;
    selectedOptionId: string | null;
    lastResult: QuizFeedback | null;
  }>({ questionId: null, selectedOptionId: null, lastResult: null });
  const hasSyncedRoadmapRef = useRef(false);

  const { questions, isLoading: isQuestionsLoading, error: questionsError } =
    useQuizQuestions(notebookId, levelId);

  useEffect(() => {
    if (!questions.length || hasSyncedRoadmapRef.current) return;
    hasSyncedRoadmapRef.current = true;
    void onReloadRoadmap();
  }, [questions.length, onReloadRoadmap]);

  const {
    attempts,
    isLoading: isAttemptsLoading,
    error: attemptsError,
    reload: reloadAttempts,
  } = useQuizAttempts(notebookId, levelId);

  const {
    submit,
    isSubmitting,
    error: submitError,
    clearError: clearSubmitError,
  } = useSubmitQuizAnswer(notebookId, levelId);

  useEffect(() => {
    if (submitError) {
      clearSubmitError();
    }
  }, [submitError, clearSubmitError]);

  const attemptsByQuestionId = useMemo(() => {
    return new Map(attempts.map((attempt) => [attempt.question_id, attempt]));
  }, [attempts]);

  const mapAttemptToResult = (attempt: QuizAttemptOut): QuizFeedback => {
    return {
      is_correct: attempt.is_correct,
      explanation: attempt.explanation,
      correct_option_id: attempt.correct_option_id,
    };
  };

  const suggestedQuestionIndex = useMemo(() => {
    if (!questions.length || isAttemptsLoading) return 0;

    const firstPendingIndex = questions.findIndex(
      (question) => !attemptsByQuestionId.has(question.id),
    );
    return firstPendingIndex === -1 ? 0 : firstPendingIndex;
  }, [questions, attemptsByQuestionId, isAttemptsLoading]);

  const activeQuestionIndex =
    questionIndexState.levelId === levelId && questionIndexState.index !== null
      ? questionIndexState.index
      : suggestedQuestionIndex;

  const safeQuestionIndex = questions.length
    ? Math.min(activeQuestionIndex, questions.length - 1)
    : 0;

  const currentQuestion = questions[safeQuestionIndex] ?? null;

  const attemptForCurrent = currentQuestion
    ? attemptsByQuestionId.get(currentQuestion.id) ?? null
    : null;

  const currentAnswerState =
    answerState.questionId === currentQuestion?.id
      ? answerState
      : { questionId: null, selectedOptionId: null, lastResult: null };

  const selectedOptionId =
    currentAnswerState.selectedOptionId ??
    attemptForCurrent?.selected_option_id ??
    null;

  const lastResult =
    currentAnswerState.lastResult ??
    (attemptForCurrent ? mapAttemptToResult(attemptForCurrent) : null);

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedOptionId) return;
    const result = await submit(currentQuestion.id, selectedOptionId);
    if (!result) return;

    setAnswerState({
      questionId: currentQuestion.id,
      selectedOptionId,
      lastResult: {
        is_correct: result.is_correct,
        explanation: result.explanation,
        correct_option_id: result.correct_option_id,
        level_score: result.level_score,
        passed: result.passed,
      },
    });

    await reloadAttempts();

    if (result.passed) {
      await onReloadRoadmap();
    }
  };

  const handleNext = () => {
    if (safeQuestionIndex + 1 >= questions.length) {
      return;
    }
    setAnswerState({ questionId: null, selectedOptionId: null, lastResult: null });
    setQuestionIndexState({ levelId, index: safeQuestionIndex + 1 });
  };

  const handleGoRoadmap = () => {
    navigate(`/notebook/${notebookId}/quiz`);
  };

  const quizErrorText =
    questionsError ?? attemptsError ?? submitError ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {levelTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Avanza por las lecciones y desbloquea el examen final.
              </p>
            </div>

            <Button
              variant="ghost"
              onClick={() => navigate(`/notebook/${notebookId}/quiz`)}
            >
              Roadmap
            </Button>
          </div>

          {quizErrorText ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
              role="alert"
            >
              {quizErrorText}
            </div>
          ) : null}

          <div>
            {isQuestionsLoading || isAttemptsLoading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                Cargando preguntas…
              </div>
            ) : currentQuestion ? (
              <div className="space-y-4">
                <QuestionView
                  question={currentQuestion}
                  index={safeQuestionIndex}
                  total={questions.length}
                  isSubmitting={isSubmitting}
                  isAnswered={Boolean(lastResult)}
                  selectedOptionId={selectedOptionId}
                  onSelectOption={(optionId) => {
                    if (!currentQuestion) return;
                    setAnswerState((prev) => ({
                      questionId: currentQuestion.id,
                      selectedOptionId: optionId,
                      lastResult:
                        prev.questionId === currentQuestion.id
                          ? prev.lastResult
                          : null,
                    }));
                  }}
                  onSubmit={handleSubmit}
                />

                {lastResult ? (
                  <div className="space-y-3">
                    <AnswerFeedback
                      isCorrect={lastResult.is_correct}
                      explanation={lastResult.explanation}
                      correctOptionId={lastResult.correct_option_id}
                      showCorrectOption={!lastResult.is_correct}
                      levelScore={lastResult.level_score}
                      passed={lastResult.passed}
                    />

                    <div className="flex justify-end">
                      {safeQuestionIndex + 1 >= questions.length ? (
                        <Button onClick={handleGoRoadmap}>Volver al roadmap</Button>
                      ) : (
                        <Button onClick={handleNext}>Siguiente</Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                No hay preguntas para este nivel.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
