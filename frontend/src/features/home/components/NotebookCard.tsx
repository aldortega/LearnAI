import { Clock } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  title: string;
  sourceCount: number;
  updatedAt: string;
  icon: IconComponent;
};

export function NotebookCard({
  title,
  sourceCount,
  updatedAt,
  icon: Icon,
}: Props) {
  return (
    <div className="group flex h-48 cursor-pointer flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--color-moss-green-200)] text-[color:var(--color-fern-600)]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-zinc-900 group-hover:text-[color:var(--color-fern-700)]">
          {title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          {sourceCount} {sourceCount === 1 ? "fuente" : "fuentes"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {updatedAt}
        </span>
      </div>
    </div>
  );
}
