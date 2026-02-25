import { FileText, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { cn } from "../../../shared/lib/cn";

import type { ReportOut } from "../types/reports.types";

type Props = {
  reports: ReportOut[];
  isGenerating: boolean;
  selectedReportId: string | null;
  deletingReportId: string | null;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (report: ReportOut) => void;
};

type ReportPreviewCardProps = {
  report: ReportOut;
  isSelected: boolean;
  isDeleting: boolean;
  isAnyReportDeleting: boolean;
  onSelectReport: (reportId: string) => void;
  onDeleteReport: (report: ReportOut) => void;
};

function ReportPreviewCard({
  report,
  isSelected,
  isDeleting,
  isAnyReportDeleting,
  onSelectReport,
  onDeleteReport,
}: ReportPreviewCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      className={cn(
        "group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60",
        isSelected && "bg-muted/50",
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[15px] font-semibold leading-tight text-foreground group-hover:text-primary">
          {report.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {report.description || "Sin descripcion breve."}
        </p>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          disabled={isAnyReportDeleting}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Opciones de ${report.title}`}
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {isMenuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-40 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
            <button
              type="button"
              onClick={handleDeleteReport}
              disabled={isAnyReportDeleting}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className={cn("h-4 w-4", isDeleting && "animate-pulse")} />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ReportsHistoryList({
  reports,
  isGenerating,
  selectedReportId,
  deletingReportId,
  onSelectReport,
  onDeleteReport,
}: Props) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-bold text-foreground">
        Informes generados{" "}
        <span className="font-normal text-muted-foreground">({reports.length})</span>
      </h3>
      {reports.length > 0 || isGenerating ? (
        <div className="rounded-xl border border-border bg-surface">
          {isGenerating ? (
            <div>
              <div className="group flex items-start gap-4 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <FileText className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="relative h-3 w-2/3 overflow-hidden rounded-full bg-muted/70">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                  <div className="relative h-2.5 w-5/6 overflow-hidden rounded-full bg-muted/60">
                    <div className="h-full w-1/2 animate-[report-skeleton-shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-background/60 to-transparent" />
                  </div>
                </div>
              </div>
              {reports.length > 0 ? <div className="mx-4 border-t border-border" /> : null}
            </div>
          ) : null}
          {reports.map((report) => {
            return (
              <div key={report.id}>
                <ReportPreviewCard
                  report={report}
                  isSelected={selectedReportId === report.id}
                  isDeleting={deletingReportId === report.id}
                  isAnyReportDeleting={Boolean(deletingReportId)}
                  onSelectReport={onSelectReport}
                  onDeleteReport={onDeleteReport}
                />
                {report.id !== reports[reports.length - 1]?.id ? (
                  <div className="mx-4 border-t border-border" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
