import { Clock } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useNavigate } from "react-router-dom";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  id: string; // Add ID prop
  title: string;
  sourceCount: number;
  updatedAt: string;
  icon: IconComponent;
};

export function NotebookCard({
  id,
  title,
  sourceCount,
  updatedAt,
  icon: Icon,
}: Props) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/notebook/${id}`)}
      className="group flex h-48 cursor-pointer flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-zinc-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-300">
          {title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
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
