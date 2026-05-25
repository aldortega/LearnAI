import { Layers } from "lucide-react";
import { useState } from "react";

import { TextField } from "../../../shared/ui/TextField";
import { Button } from "../../../shared/ui/Button";
import type {
  FlashcardCountPreset,
  FlashcardDifficulty,
  FlashcardsGenerateRequest,
} from "../types/flashcards.types";

type Props = {
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  showConfiguration?: boolean;
  initialCardCount?: FlashcardCountPreset;
  initialDifficulty?: FlashcardDifficulty;
  initialTopicPrompt?: string;
  onGenerateDefault: () => void;
  onGenerateCustom: (options: FlashcardsGenerateRequest) => void;
};

export function GenerateFlashcardsCard({
  isGenerating,
  canGenerate,
  error,
  showConfiguration = false,
  initialCardCount = "default",
  initialDifficulty = "medium",
  initialTopicPrompt = "",
  onGenerateDefault,
  onGenerateCustom,
}: Props) {
  const [cardCount, setCardCount] =
    useState<FlashcardCountPreset>(initialCardCount);
  const [difficulty, setDifficulty] =
    useState<FlashcardDifficulty>(initialDifficulty);
  const [topicPrompt, setTopicPrompt] = useState(initialTopicPrompt);

  const handleGenerate = () => {
    if (!showConfiguration) {
      onGenerateDefault();
      return;
    }

    onGenerateCustom({
      card_count: cardCount,
      difficulty,
      topic_prompt: topicPrompt.trim(),
    });
    setTopicPrompt("");
  };

  const buttonLabel =
    showConfiguration ? "Generar" : "Generar";

  return (
    <div className="flex h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Layers className="h-6 w-6" />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          {isGenerating ? "Generando flashcards..." : "Todavia no hay flashcards"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Genera tarjetas mixtas de estudio: definiciones, preguntas y completar espacios.
        </p>

        {showConfiguration ? (
          <div className="mt-6 grid gap-4 text-left">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Numero de tarjetas</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                  {([
                    { value: "less", label: "Menos" },
                    { value: "default", label: "Por defecto" },
                    { value: "more", label: "Mas" },
                  ] as const).map((option) => {
                    const isActive = option.value === cardCount;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCardCount(option.value)}
                        aria-pressed={isActive}
                        className={
                          "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                          (isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted-hover/60")
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-foreground">Dificultad</p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                  {([
                    { value: "easy", label: "Facil" },
                    { value: "medium", label: "Medio" },
                    { value: "hard", label: "Dificil" },
                  ] as const).map((option) => {
                    const isActive = option.value === difficulty;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDifficulty(option.value)}
                        aria-pressed={isActive}
                        className={
                          "rounded-lg px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                          (isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted-hover/60")
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <TextField
              label="Cual deberia ser el tema?"
              name="topicPrompt"
              value={topicPrompt}
              onChange={setTopicPrompt}
              placeholder="Ej: fundamentos de redes neuronales para principiantes"
            />
          </div>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Button onClick={handleGenerate} disabled={!canGenerate} loading={isGenerating}>
            {buttonLabel}
          </Button>
        </div>

        {!canGenerate ? (
          <p className="mt-3 text-xs text-muted-foreground" role="alert">
            Necesitas al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}
