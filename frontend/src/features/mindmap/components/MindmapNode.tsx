import { ChevronDown, ChevronRight } from "lucide-react";
import { Handle, Position, type NodeProps } from "reactflow";

import { cn } from "../../../shared/lib/cn";

export type MindmapNodeData = {
  title: string;
  canToggle: boolean;
  isExpanded: boolean;
  onToggle: (nodeId: string) => void;
};

export function MindmapNode({
  id,
  data,
  selected,
}: NodeProps<MindmapNodeData>) {
  return (
    <div
      className={cn(
        "group relative min-w-[170px] max-w-[280px] rounded-xl border bg-surface px-3 py-2 shadow-sm transition",
        selected
          ? "border-primary ring-2 ring-primary/25"
          : "border-border hover:border-primary/60",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-0 !bg-border"
      />
      <div className="relative flex items-center justify-center">
        <p
          className={cn(
            "w-full break-words text-center text-sm font-medium leading-snug text-foreground",
            data.canToggle ? "pr-6" : "",
          )}
        >
          {data.title}
        </p>
        {data.canToggle ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              data.onToggle(id);
            }}
            className="absolute right-0 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={data.isExpanded ? "Ocultar nodos hijos" : "Mostrar nodos hijos"}
            title={data.isExpanded ? "Ocultar nodos hijos" : "Mostrar nodos hijos"}
          >
            {data.isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-0 !bg-border"
      />
    </div>
  );
}
