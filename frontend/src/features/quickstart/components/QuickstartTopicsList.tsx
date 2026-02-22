import { useMemo } from "react";

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

  return (
    <div className="rounded-xl border border-border bg-surface">
      {topics.map((topic, index) => (
        <div key={topic.id}>
          {index > 0 ? <div className="mx-4 border-t border-border" /> : null}
          <QuickstartTopicCard
            topic={topic}
            notebookId={notebookId}
            canDelete={canDelete}
            isDeleting={deletingTopicId === topic.id || isReordering}
            onDeleteTopic={onDeleteTopic}
            cardRef={(element) => setTopicElement(topic.id, element)}
            isDragging={isDnDEnabled && draggingTopicId === topic.id}
            dropEdge={isDnDEnabled ? getDropEdge(topic.id) : null}
          />
        </div>
      ))}
    </div>
  );
}
