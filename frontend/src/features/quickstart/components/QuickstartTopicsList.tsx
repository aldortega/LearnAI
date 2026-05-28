import { useCallback, useMemo } from "react";

import { useQuickstartTopicsDnD } from "../hooks/useQuickstartTopicsDnD";
import type { QuickstartTopic } from "../types/quickstart.types";
import { QuickstartTopicCard } from "./QuickstartTopicCard";

type Props = {
  topics: QuickstartTopic[];
  notebookId?: string;
  canDelete: boolean;
  canReorder: boolean;
  isReordering: boolean;
  deletingTopicId: string | null;
  onDeleteTopic: (topic: QuickstartTopic) => void;
  onReorderTopics: (topicIds: string[]) => Promise<void>;
};

export function QuickstartTopicsList({
  topics,
  notebookId,
  canDelete,
  canReorder,
  isReordering,
  deletingTopicId,
  onDeleteTopic,
  onReorderTopics,
}: Props) {
  const canUseDesktopDnD = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer:fine)").matches;
  }, []);

  const isInteractionDisabled = isReordering || Boolean(deletingTopicId);
  const isDnDEnabled = canReorder && canUseDesktopDnD;
  const { setTopicElement, draggingTopicId, getDropEdge } = useQuickstartTopicsDnD({
    topics,
    enabled: isDnDEnabled,
    isDisabled: isInteractionDisabled,
    onReorder: onReorderTopics,
  });

  const handleMoveTopic = useCallback(
    (topicId: string, direction: -1 | 1) => {
      if (!canReorder || isInteractionDisabled) return;
      const index = topics.findIndex((topic) => topic.id === topicId);
      if (index < 0) return;
      const target = index + direction;
      if (target < 0 || target >= topics.length) return;

      const next = topics.slice();
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      void onReorderTopics(next.map((topic) => topic.id));
    },
    [canReorder, isInteractionDisabled, onReorderTopics, topics],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface">
      {topics.map((topic, index) => (
        <QuickstartTopicCard
          key={topic.id}
          topic={topic}
          position={index}
          notebookId={notebookId}
          canDelete={canDelete}
          isDeleting={deletingTopicId === topic.id || isReordering}
          canMoveUp={canReorder && index > 0}
          canMoveDown={canReorder && index < topics.length - 1}
          isDnDEnabled={isDnDEnabled}
          onDeleteTopic={onDeleteTopic}
          onMoveTopic={handleMoveTopic}
          cardRef={(element) => setTopicElement(topic.id, element)}
          isDragging={isDnDEnabled && draggingTopicId === topic.id}
          dropEdge={isDnDEnabled ? getDropEdge(topic.id) : null}
        />
      ))}
    </div>
  );
}
