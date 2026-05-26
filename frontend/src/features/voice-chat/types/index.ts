export type VoiceToolParameterSchema = {
  type: string;
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
};

export type VoiceToolSchema = {
  name: string;
  description: string;
  parameters: VoiceToolParameterSchema;
};

export type VoiceTokenResponse = {
  token: string;
  model: string;
  system_instruction: string;
  tool_name: string;
  tool_schema: VoiceToolSchema;
  notebook_id: string;
};

export type VoiceChunk = {
  text: string;
  source_name: string | null;
  page: number | null;
  score: number;
};

export type VoiceRetrieveResponse = {
  chunks: VoiceChunk[];
};

export type VoicePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking"
  | "error"
  | "ended";
