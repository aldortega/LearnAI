const FALLBACK_TOPIC_EMOJI = "📘";

export function resolveTopicEmoji(emoji: string | null | undefined): string {
  return emoji?.trim() || FALLBACK_TOPIC_EMOJI;
}
