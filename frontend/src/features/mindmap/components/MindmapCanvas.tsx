import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Position,
  type Edge,
  type Node,
} from "reactflow";

import "reactflow/dist/style.css";

import { MindmapNode, type MindmapNodeData } from "./MindmapNode";
import type { MindmapNodeOut } from "../types/mindmap.types";

type Props = {
  nodes: MindmapNodeOut[];
  rootNodeId: string | null;
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  onSelectNode: (nodeId: string) => void;
  onToggleNode: (nodeId: string) => void;
};

const nodeTypes = {
  mindmapNode: MindmapNode,
};

function buildChildrenByParent(nodes: MindmapNodeOut[]): Map<string, string[]> {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const current = childrenByParent.get(node.parent_id) ?? [];
    current.push(node.id);
    childrenByParent.set(node.parent_id, current);
  }
  return childrenByParent;
}

function computeVisibleNodeIds(
  rootNodeId: string | null,
  childrenByParent: Map<string, string[]>,
  expandedNodeIds: Set<string>,
): string[] {
  if (!rootNodeId) return [];
  const queue = [rootNodeId];
  const visible: string[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    visible.push(current);
    if (!expandedNodeIds.has(current)) continue;
    const children = childrenByParent.get(current) ?? [];
    for (const childId of children) {
      queue.push(childId);
    }
  }

  return visible;
}

function resolveNodeSequence(nodeId: string): number {
  const match = nodeId.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const parsed = Number.parseInt(match[0], 10);
  if (!Number.isFinite(parsed)) return Number.MAX_SAFE_INTEGER;
  return parsed;
}

function sortNodeIds(nodeIds: string[]): string[] {
  return [...nodeIds].sort((left, right) => {
    const leftOrder = resolveNodeSequence(left);
    const rightOrder = resolveNodeSequence(right);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.localeCompare(right);
  });
}

function computeSubtreeSpan(
  nodeId: string,
  childrenByParent: Map<string, string[]>,
  visibleSet: Set<string>,
  memo: Map<string, number>,
  path: Set<string>,
): number {
  const cached = memo.get(nodeId);
  if (cached) return cached;
  if (path.has(nodeId)) return 1;
  path.add(nodeId);

  const childIds = sortNodeIds(
    (childrenByParent.get(nodeId) ?? []).filter((childId) => visibleSet.has(childId)),
  );

  if (childIds.length === 0) {
    memo.set(nodeId, 1);
    path.delete(nodeId);
    return 1;
  }

  let span = 0;
  for (const childId of childIds) {
    span += computeSubtreeSpan(childId, childrenByParent, visibleSet, memo, path);
  }
  const resolvedSpan = Math.max(1, span);
  memo.set(nodeId, resolvedSpan);
  path.delete(nodeId);
  return resolvedSpan;
}

function buildPositions(
  rootNodeId: string | null,
  visibleNodeIds: string[],
  childrenByParent: Map<string, string[]>,
): Map<string, { x: number; y: number }> {
  if (!rootNodeId) return new Map();

  const positionsInUnits = new Map<string, { x: number; y: number }>();
  const visibleSet = new Set(visibleNodeIds);
  const subtreeSpanMemo = new Map<string, number>();
  const xGap = 320;
  const yGap = 165;

  computeSubtreeSpan(
    rootNodeId,
    childrenByParent,
    visibleSet,
    subtreeSpanMemo,
    new Set(),
  );

  const place = (nodeId: string, depth: number, top: number) => {
    const span = subtreeSpanMemo.get(nodeId) ?? 1;
    const yCenter = top + (span - 1) / 2;
    positionsInUnits.set(nodeId, { x: depth, y: yCenter });

    let nextTop = top;
    const childIds = sortNodeIds(
      (childrenByParent.get(nodeId) ?? []).filter((childId) => visibleSet.has(childId)),
    );
    for (const childId of childIds) {
      const childSpan = subtreeSpanMemo.get(childId) ?? 1;
      place(childId, depth + 1, nextTop);
      nextTop += childSpan;
    }
  };

  place(rootNodeId, 0, 0);

  const rootY = positionsInUnits.get(rootNodeId)?.y ?? 0;
  const positions = new Map<string, { x: number; y: number }>();
  for (const nodeId of visibleNodeIds) {
    const position = positionsInUnits.get(nodeId);
    if (!position) continue;
    positions.set(nodeId, {
      x: position.x * xGap,
      y: (position.y - rootY) * yGap,
    });
  }

  return positions;
}

export function MindmapCanvas({
  nodes,
  rootNodeId,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onToggleNode,
}: Props) {
  const nodeById = useMemo(() => {
    return new Map(nodes.map((node) => [node.id, node]));
  }, [nodes]);

  const childrenByParent = useMemo(() => buildChildrenByParent(nodes), [nodes]);

  const visibleNodeIds = useMemo(
    () => computeVisibleNodeIds(rootNodeId, childrenByParent, expandedNodeIds),
    [rootNodeId, childrenByParent, expandedNodeIds],
  );

  const visibleNodes = useMemo(() => {
    return visibleNodeIds
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is MindmapNodeOut => Boolean(node));
  }, [nodeById, visibleNodeIds]);

  const positions = useMemo(
    () => buildPositions(rootNodeId, visibleNodeIds, childrenByParent),
    [rootNodeId, visibleNodeIds, childrenByParent],
  );

  const flowNodes: Node<MindmapNodeData>[] = useMemo(() => {
    return visibleNodes.map((node) => {
      const hasChildren = (childrenByParent.get(node.id)?.length ?? 0) > 0;
      return {
        id: node.id,
        type: "mindmapNode",
        data: {
          title: node.title,
          canToggle: hasChildren,
          isExpanded: expandedNodeIds.has(node.id),
          onToggle: onToggleNode,
        },
        position: positions.get(node.id) ?? { x: node.depth * 250, y: 0 },
        selected: node.id === selectedNodeId,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        draggable: false,
      };
    });
  }, [
    childrenByParent,
    expandedNodeIds,
    onToggleNode,
    positions,
    selectedNodeId,
    visibleNodes,
  ]);

  const flowEdges: Edge[] = useMemo(() => {
    const visibleSet = new Set(visibleNodeIds);
    return visibleNodes
      .filter((node) => node.parent_id && visibleSet.has(node.parent_id))
      .map((node) => ({
        id: `${node.parent_id}-${node.id}`,
        source: node.parent_id!,
        target: node.id,
        animated: false,
      }));
  }, [visibleNodeIds, visibleNodes]);

  if (!rootNodeId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No hay nodos para mostrar.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelectNode(node.id)}
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.35}
        maxZoom={1.6}
        attributionPosition="bottom-left"
      >
        <Controls showInteractive={false} />
        <Background gap={18} size={1} />
      </ReactFlow>
    </div>
  );
}
