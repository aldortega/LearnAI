// PROTOTYPE — onboarding demo (throwaway). Mini mapa mental horizontal, imitando el canvas real.
import { useState } from "react";

import { cn } from "../../../../shared/lib/cn";
import { DEMO_MINDMAP } from "../demoData";

const NODE_H = 26;
const ROOT = { x: 4, w: 96 };
const BRANCH = { x: 140, w: 116 };
const LEAF = { x: 296, w: 124 };
const LEAF_GAP = 34;
const BRANCH_GAP = 110;
const TOP = 16;

type LaidOutNode = { id: string; label: string; x: number; y: number; w: number; level: 0 | 1 | 2; delay: number };
type LaidOutEdge = { id: string; from: LaidOutNode; to: LaidOutNode };

function layout() {
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

const { nodes, edges, height } = layout();
const WIDTH = LEAF.x + LEAF.w + 4;

function curve(from: LaidOutNode, to: LaidOutNode): string {
  const x1 = from.x + from.w;
  const x2 = to.x;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${from.y} C ${mid} ${from.y}, ${mid} ${to.y}, ${x2} ${to.y}`;
}

export function DemoMindmap() {
  const [selectedId, setSelectedId] = useState<string>("b0");
  const selected = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" role="img" aria-label={`Mapa mental de ${DEMO_MINDMAP.root}`}>
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={curve(edge.from, edge.to)}
            className={cn(
              "animate-fade-up fill-none stroke-[1.5] transition-colors",
              selectedId === edge.to.id || selectedId === edge.from.id ? "stroke-primary" : "stroke-border-strong",
            )}
            style={{ animationDelay: `${edge.to.delay}ms` }}
          />
        ))}
        {nodes.map((node) => {
          const isRoot = node.level === 0;
          const isSelected = node.id === selectedId;
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={node.label}
              onClick={() => setSelectedId(node.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedId(node.id)}
              className="animate-fade-up cursor-pointer outline-none [&:focus-visible>rect]:stroke-primary [&:focus-visible>rect]:stroke-2"
              style={{ animationDelay: `${node.delay}ms` }}
            >
              <rect
                x={node.x}
                y={node.y - NODE_H / 2}
                width={node.w}
                height={NODE_H}
                rx={9}
                className={cn(
                  "transition-colors",
                  isRoot && "fill-primary stroke-primary",
                  !isRoot && isSelected && "fill-primary/15 stroke-primary",
                  !isRoot && !isSelected && "fill-muted stroke-border-strong hover:stroke-primary/60",
                )}
                strokeWidth={1}
              />
              <text
                x={node.x + node.w / 2}
                y={node.y}
                dominantBaseline="central"
                textAnchor="middle"
                className={cn(
                  "pointer-events-none text-[11px]",
                  isRoot ? "fill-primary-foreground font-semibold" : "fill-foreground font-medium",
                )}
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
      {selected ? (
        <p key={selected.id} className="animate-fade-up rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{selected.label}</span> · Tocá cualquier nodo para ver su explicación basada en tus fuentes.
        </p>
      ) : null}
    </div>
  );
}
