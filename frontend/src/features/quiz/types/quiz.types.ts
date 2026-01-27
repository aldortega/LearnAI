export type RoadmapLevelStatus = "locked" | "unlocked" | "passed";
export type RoadmapLevelType = "lesson" | "exam";
export type RoadmapQuestionStatus = "idle" | "generating" | "ready" | "failed";

export type RoadmapLevelOut = {
  id: string;
  unit_id: string;
  title: string;
  type: RoadmapLevelType;
  order: number;
  passing_score: number;
  status: RoadmapLevelStatus;
  best_score?: number | null;
  questions_status?: RoadmapQuestionStatus | null;
};

export type RoadmapUnitOut = {
  id: string;
  title: string;
  description: string;
  order: number;
  levels: RoadmapLevelOut[];
};

export type RoadmapOut = {
  id: string;
  notebook_id: string;
  owner_id: string;
  title: string;
  units: RoadmapUnitOut[];
  created_at: string;
  updated_at: string;
};

export type QuizLength = "short" | "medium" | "long";
export type QuizDifficulty = "basic" | "intermediate" | "advanced";

export type QuizGenerateRequest = {
  length: QuizLength;
  difficulty: QuizDifficulty;
};

export type QuizGenerationJobOut = {
  job_id: string;
  status: "queued" | "processing" | "done" | "failed";
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type QuizQuestionsGenerationOut = {
  status: RoadmapQuestionStatus;
  error?: string | null;
};

export type QuizOptionOut = {
  id: string;
  text: string;
};

export type QuizQuestionOut = {
  id: string;
  level_id: string;
  unit_id: string;
  question: string;
  options: QuizOptionOut[];
  hint: string;
};

export type QuizSubmitRequest = {
  question_id: string;
  selected_option_id: string;
};

export type QuizSubmitResponse = {
  is_correct: boolean;
  explanation: string;
  correct_option_id: string;
  level_score: number;
  passed: boolean;
  unlocked_levels: string[];
};

export type QuizAttemptOut = {
  question_id: string;
  selected_option_id: string;
  is_correct: boolean;
  correct_option_id: string;
  explanation: string;
  created_at: string;
};
