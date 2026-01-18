import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../../shared/ui/Button";
import { Card } from "../../../shared/ui/Card";
import { useQuizQuestions } from "../hooks/useQuizQuestions";
import { useSubmitQuizAnswer } from "../hooks/useSubmitQuizAnswer";
import type { QuizSubmitResponse, RoadmapOut } from "../types/quiz.types";
import { AnswerFeedback } from "./AnswerFeedback";
import { QuestionView } from "./QuestionView";

type Props = {
  notebookId: string;
  levelId: string;
  roadmap: RoadmapOut;
  onReloadRoadmap: () => Promise<void>;
};

export function QuizArea({
  notebookId,
  levelId,
  roadmap,
  onReloadRoadmap,
}: Props) {
  const navigate = useNavigate();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<QuizSubmitResponse | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setQuestionIndex(0);
      setSelectedOptionId(null);
      setLastResult(null);
    });
  }, [levelId]);

  const { questions, isLoading: isQuestionsLoading, error: questionsError } =
    useQuizQuestions(notebookId, levelId);

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

  const currentQuestion = questions[questionIndex] ?? null;

  const handleSubmit = async () => {
    if (!currentQuestion || !selectedOptionId) return;
    const result = await submit(currentQuestion.id, selectedOptionId);
    if (!result) return;

    setLastResult(result);

    if (result.passed) {
      await onReloadRoadmap();
    }
  };

  const handleNext = () => {
    setLastResult(null);
    setSelectedOptionId(null);

    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      return;
    }
    setQuestionIndex(nextIndex);
  };

  const quizErrorText = questionsError ?? submitError ?? null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <Card className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Quiz
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {roadmap.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Avanza por las lecciones y desbloquea el examen final.
            </p>
          </div>

          <Button variant="ghost" onClick={() => navigate(`/notebook/${notebookId}/quiz`)}>
            Roadmap
          </Button>
        </div>

        {quizErrorText ? (
          <div
            className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200"
            role="alert"
          >
            {quizErrorText}
          </div>
        ) : null}

        <div className="mt-6">
          {isQuestionsLoading ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              Cargando preguntas…
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <QuestionView
                question={currentQuestion}
                index={questionIndex}
                total={questions.length}
                isSubmitting={isSubmitting}
                isAnswered={Boolean(lastResult)}
                selectedOptionId={selectedOptionId}
                onSelectOption={setSelectedOptionId}
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
                    <Button onClick={handleNext}>
                      {questionIndex + 1 >= questions.length
                        ? "Finalizar nivel"
                        : "Siguiente"}
                    </Button>
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
      </Card>
    </div>
  );
}
