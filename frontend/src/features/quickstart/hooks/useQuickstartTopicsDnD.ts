import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { preserveOffsetOnSource } from "@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
import { useCallback, useEffect, useRef, useState } from "react";

import type { QuickstartTopic } from "../types/quickstart.types";

type TopicDropEdge = Extract<Edge, "top" | "bottom">;

type TopicDragData = {
  type: "quickstart-topic";
  topicId: string;
  index: number;
};

type Params = {
  topics: QuickstartTopic[];
  enabled: boolean;
  isDisabled: boolean;
  onReorder: (orderedTopicIds: string[]) => Promise<void> | void;
};

type Result = {
  setTopicElement: (topicId: string, element: HTMLElement | null) => void;
  draggingTopicId: string | null;
  getDropEdge: (topicId: string) => TopicDropEdge | null;
};

const allowedEdges: TopicDropEdge[] = ["top", "bottom"];

function toVerticalEdge(edge: Edge | null): TopicDropEdge | null {
  if (edge === "top" || edge === "bottom") return edge;
  return null;
}

function isTopicDragData(data: Record<string | symbol, unknown>): data is TopicDragData {
  return (
    data.type === "quickstart-topic"
    && typeof data.topicId === "string"
    && typeof data.index === "number"
  );
}

export function useQuickstartTopicsDnD({
  topics,
  enabled,
  isDisabled,
  onReorder,
}: Params): Result {
  const elementByTopicIdRef = useRef(new Map<string, HTMLElement>());
  const [draggingTopicId, setDraggingTopicId] = useState<string | null>(null);
  const [dropEdgeByTopicId, setDropEdgeByTopicId] = useState<Record<string, TopicDropEdge | null>>({});

  const setTopicElement = useCallback((topicId: string, element: HTMLElement | null) => {
    const map = elementByTopicIdRef.current;
    if (!element) {
      map.delete(topicId);
      return;
    }
    map.set(topicId, element);
  }, []);

  const getDropEdge = useCallback((topicId: string) => {
    return dropEdgeByTopicId[topicId] ?? null;
  }, [dropEdgeByTopicId]);

  useEffect(() => {
    if (!enabled || topics.length < 2) return;

    const cleanups: Array<() => void> = [];

    topics.forEach((topic, index) => {
      const element = elementByTopicIdRef.current.get(topic.id);
      if (!element) return;

      cleanups.push(
        combine(
          draggable({
            element,
            canDrag: () => !isDisabled,
            getInitialData: () => ({
              type: "quickstart-topic",
              topicId: topic.id,
              index,
            }),
            onGenerateDragPreview: ({ nativeSetDragImage, location }) => {
              setCustomNativeDragPreview({
                nativeSetDragImage,
                getOffset: preserveOffsetOnSource({
                  element,
                  input: location.current.input,
                }),
                render: ({ container }) => {
                  const preview = element.cloneNode(true);
                  if (!(preview instanceof HTMLElement)) return;

                  preview.style.width = `${element.clientWidth}px`;
                  preview.style.maxWidth = `${element.clientWidth}px`;
                  preview.style.transform = "none";
                  preview.style.pointerEvents = "none";
                  preview.style.margin = "0";
                  container.appendChild(preview);

                  return () => {
                    preview.remove();
                  };
                },
              });
            },
          }),
          dropTargetForElements({
            element,
            canDrop: ({ source }) => {
              if (isDisabled) return false;
              if (!isTopicDragData(source.data)) return false;
              return source.data.topicId !== topic.id;
            },
            getIsSticky: () => true,
            getData: ({ input }) =>
              attachClosestEdge(
                {
                  type: "quickstart-topic",
                  topicId: topic.id,
                  index,
                },
                { element, input, allowedEdges },
              ),
            onDrag: ({ self, source }) => {
              if (!isTopicDragData(source.data)) return;
              const edge = toVerticalEdge(extractClosestEdge(self.data));
              const sourceIndex = source.data.index;
              const targetIndex = index;
              const isNoop = (
                !edge
                || targetIndex === sourceIndex
                || (edge === "bottom" && targetIndex === sourceIndex - 1)
                || (edge === "top" && targetIndex === sourceIndex + 1)
              );
              const nextEdge = isNoop ? null : edge;

              setDropEdgeByTopicId((current) => {
                if (current[topic.id] === nextEdge) return current;
                return { ...current, [topic.id]: nextEdge };
              });
            },
            onDragLeave: () => {
              setDropEdgeByTopicId((current) => {
                if (current[topic.id] == null) return current;
                return { ...current, [topic.id]: null };
              });
            },
            onDrop: () => {
              setDropEdgeByTopicId((current) => {
                if (current[topic.id] == null) return current;
                return { ...current, [topic.id]: null };
              });
            },
          }),
        ),
      );
    });

    cleanups.push(
      monitorForElements({
        canMonitor: ({ source }) => isTopicDragData(source.data),
        onDragStart: ({ source }) => {
          if (!isTopicDragData(source.data)) return;
          setDraggingTopicId(source.data.topicId);
        },
        onDrop: ({ source, location }) => {
          setDraggingTopicId(null);
          setDropEdgeByTopicId({});

          if (isDisabled) return;
          if (!isTopicDragData(source.data)) return;

          const primaryTarget = location.current.dropTargets[0];
          if (!primaryTarget || !isTopicDragData(primaryTarget.data)) return;

          const closestEdge = toVerticalEdge(extractClosestEdge(primaryTarget.data));
          if (!closestEdge) return;

          const reordered = reorderWithEdge({
            list: topics,
            startIndex: source.data.index,
            indexOfTarget: primaryTarget.data.index,
            closestEdgeOfTarget: closestEdge,
            axis: "vertical",
          });

          const orderedTopicIds = reordered.map((topic) => topic.id);
          const hasChanged = orderedTopicIds.some((topicId, index) => {
            return topicId !== topics[index]?.id;
          });
          if (!hasChanged) return;

          void onReorder(orderedTopicIds);
        },
      }),
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled, isDisabled, onReorder, topics]);

  return {
    setTopicElement,
    draggingTopicId,
    getDropEdge,
  };
}
