import { useMemo } from "react";

import { useQuickstartTopicsDnD } from "../hooks/useQuickstartTopicsDnD";
import type { QuickstartTopic } from "../types/quickstart.types";
import { QuickstartTopicCard } from "./QuickstartTopicCard";

type Props = {
  topics: QuickstartTopic[];
  notebookId?: string;
  isStale: boolean;
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
  isStale,
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

  return (
    <div className="space-y-4">
      {topics.map((topic) => (
        <QuickstartTopicCard
          key={topic.id}
          topic={topic}
          notebookId={notebookId}
          isStale={isStale}
          canDelete={canDelete}
          isDeleting={deletingTopicId === topic.id || isReordering}
          onDeleteTopic={onDeleteTopic}
          cardRef={(element) => setTopicElement(topic.id, element)}
          isDragging={isDnDEnabled && draggingTopicId === topic.id}
          dropEdge={isDnDEnabled ? getDropEdge(topic.id) : null}
        />
      ))}
    </div>
  );
}
