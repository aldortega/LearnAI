import { Streamdown } from "streamdown";

import type { ReportOut } from "../types/reports.types";

type Props = {
  report: ReportOut | null;
  isLoading: boolean;
  error: string | null;
};

export function ReportViewer({ report, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Cargando informe...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="h-full rounded-2xl border border-error bg-error/10 p-6 shadow-sm">
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="h-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Selecciona un informe para ver el contenido.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-border bg-surface shadow-sm">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div
          className="
            max-w-none text-sm leading-relaxed text-foreground
            [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold
            [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold
            [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold
            [&_p]:my-3
            [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6
            [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6
            [&_li]:my-1
            [&_ul_ul]:list-[circle] [&_ul_ul]:pl-5
            [&_ol_ol]:list-[lower-alpha] [&_ol_ol]:pl-5
            [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4
            [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3
            [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5
            [&_pre_code]:bg-transparent [&_pre_code]:p-0
          "
        >
          <Streamdown>{report.content}</Streamdown>
        </div>
      </div>
    </section>
  );
}
