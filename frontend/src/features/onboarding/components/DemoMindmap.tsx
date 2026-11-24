import { useState } from "react";

import { cn } from "../../../shared/lib/cn";
import { DEMO_MINDMAP } from "../utils/demoContent";
import {
  DEMO_MINDMAP_LAYOUT,
  MINDMAP_NODE_HEIGHT,
  MINDMAP_WIDTH,
  mindmapCurve,
} from "../utils/mindmapLayout";

const { nodes, edges, height } = DEMO_MINDMAP_LAYOUT;

export function DemoMindmap() {
  const [selectedId, setSelectedId] = useState<string>("b0");
  const selected = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${MINDMAP_WIDTH} ${height}`} className="w-full" role="img" aria-label={`Mapa mental de ${DEMO_MINDMAP.root}`}>
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={mindmapCurve(edge.from, edge.to)}
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
                y={node.y - MINDMAP_NODE_HEIGHT / 2}
                width={node.w}
                height={MINDMAP_NODE_HEIGHT}
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
