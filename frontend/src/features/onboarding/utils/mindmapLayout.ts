import { DEMO_MINDMAP } from "./demoContent";

export const MINDMAP_NODE_HEIGHT = 26;
const ROOT = { x: 4, w: 96 };
const BRANCH = { x: 140, w: 116 };
const LEAF = { x: 296, w: 124 };
const LEAF_GAP = 34;
const BRANCH_GAP = 110;
const TOP = 16;

export type LaidOutNode = { id: string; label: string; x: number; y: number; w: number; level: 0 | 1 | 2; delay: number };
export type LaidOutEdge = { id: string; from: LaidOutNode; to: LaidOutNode };

function layoutMindmap(): { nodes: LaidOutNode[]; edges: LaidOutEdge[]; height: number } {
  const nodes: LaidOutNode[] = [];
  const edges: LaidOutEdge[] = [];
  const branchCount = DEMO_MINDMAP.branches.length;
  const height = TOP * 2 + (branchCount - 1) * BRANCH_GAP + 2 * LEAF_GAP;
  const root: LaidOutNode = { id: "root", label: DEMO_MINDMAP.root, x: ROOT.x, y: height / 2, w: ROOT.w, level: 0, delay: 0 };
  nodes.push(root);
  let order = 1;
  DEMO_MINDMAP.branches.forEach((branch, bi) => {
    const by = TOP + LEAF_GAP + bi * BRANCH_GAP;
    const b: LaidOutNode = { id: `b${bi}`, label: branch.label, x: BRANCH.x, y: by, w: BRANCH.w, level: 1, delay: order++ * 120 };
    nodes.push(b);
    edges.push({ id: `e-root-${b.id}`, from: root, to: b });
    branch.children.forEach((child, ci) => {
      const leaf: LaidOutNode = { id: `${b.id}l${ci}`, label: child, x: LEAF.x, y: by + (ci - 1) * LEAF_GAP, w: LEAF.w, level: 2, delay: (order++ + 2) * 120 };
      nodes.push(leaf);
      edges.push({ id: `e-${b.id}-${leaf.id}`, from: b, to: leaf });
    });
  });
  return { nodes, edges, height };
}

export const DEMO_MINDMAP_LAYOUT = layoutMindmap();
export const MINDMAP_WIDTH = LEAF.x + LEAF.w + 4;

export function mindmapCurve(from: LaidOutNode, to: LaidOutNode): string {
  const x1 = from.x + from.w;
  const x2 = to.x;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${x2} ${to.y}`;
}
