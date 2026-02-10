import { Trash2 } from "lucide-react";

import type { ReportOut } from "../types/reports.types";

type Props = {
  reports: ReportOut[];
  selectedReportId: string | null;
  deletingReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (report: ReportOut) => void;
};

function formatDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleString();
}

export function ReportsHistoryList({
  reports,
  selectedReportId,
  deletingReportId,
  onSelectReport,
  onDeleteReport,
}: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Historial</h3>
        <span className="text-xs text-muted-foreground">{reports.length} informes</span>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aun no hay informes generados.
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {reports.map((report) => {
            const isDeleting = deletingReportId === report.id;
            const isSelected = selectedReportId === report.id;
            return (
              <div
                key={report.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectReport(report.id)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onSelectReport(report.id);
                }}
                className={`rounded-xl border p-3 transition ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="w-full text-left">
                  <p className="truncate text-sm font-medium text-foreground">
                    {report.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(report.created_at)}
                  </p>
                  {report.is_stale ? (
                    <p className="mt-1 text-xs text-warning">
                      Desactualizado por cambios en fuentes
                    </p>
                  ) : null}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onDeleteReport(report)}
                    disabled={Boolean(deletingReportId)}
                    className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Eliminar ${report.title}`}
                    title="Eliminar informe"
                  >
                    <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
