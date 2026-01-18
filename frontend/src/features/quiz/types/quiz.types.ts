export type RoadmapLevelStatus = "locked" | "unlocked" | "passed";
export type RoadmapLevelType = "lesson" | "exam";

export type RoadmapLevelOut = {
  id: string;
  unit_id: string;
  title: string;
  type: RoadmapLevelType;
  order: number;
  passing_score: number;
  status: RoadmapLevelStatus;
  best_score?: number | null;
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
