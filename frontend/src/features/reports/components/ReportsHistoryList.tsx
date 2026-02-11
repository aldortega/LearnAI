import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import type { ReportOut } from "../types/reports.types";

type Props = {
  reports: ReportOut[];
  selectedReportId: string | null;
  deletingReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (report: ReportOut) => void;
};

type ReportPreviewCardProps = {
  report: ReportOut;
  isDeleting: boolean;
  isAnyReportDeleting: boolean;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (report: ReportOut) => void;
};

function ReportPreviewCard({
  report,
  isDeleting,
  isAnyReportDeleting,
  onSelectReport,
  onDeleteReport,
}: ReportPreviewCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const handleToggleMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen((current) => !current);
  };

  const handleDeleteReport = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsMenuOpen(false);
    onDeleteReport(report);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectReport(report.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelectReport(report.id);
      }}
      className="rounded-xl border border-border p-3 transition hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground break-words">
          {report.title}
        </p>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={handleToggleMenu}
            disabled={isAnyReportDeleting}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Opciones de ${report.title}`}
            aria-expanded={isMenuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <div className="absolute right-0 z-10 mt-1 w-36 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={isAnyReportDeleting}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-error transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {report.description || "Sin descripcion breve."}
      </p>
      {report.is_stale ? (
        <p className="mt-1 text-xs text-warning">
          Desactualizado por cambios en fuentes
        </p>
      ) : null}
    </div>
  );
}

export function ReportsHistoryList({
  reports,
  selectedReportId: _selectedReportId,
  deletingReportId,
  onSelectReport,
  onDeleteReport,
}: Props) {
  void _selectedReportId;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Informes generados</h3>
        <span className="text-xs text-muted-foreground">{reports.length} informes</span>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aun no hay informes generados.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => {
            return (
              <ReportPreviewCard
                key={report.id}
                report={report}
                isDeleting={deletingReportId === report.id}
                isAnyReportDeleting={Boolean(deletingReportId)}
                onSelectReport={onSelectReport}
                onDeleteReport={onDeleteReport}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
