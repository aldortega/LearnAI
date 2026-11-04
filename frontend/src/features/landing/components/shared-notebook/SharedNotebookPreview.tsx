import { FileText, UserPlus } from "lucide-react";

import { cn } from "../../../../shared/lib/cn";
import { PREVIEW_FILES_SHARED, PREVIEW_MEMBERS, PREVIEW_PENDING_INVITE } from "../../utils/previewContent";
import { MemberAvatar } from "./MemberAvatar";

export function SharedNotebookPreview() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-foreground">Biología celular</p>
          <p className="font-mono text-xs text-muted-foreground">3 personas con acceso</p>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          <UserPlus className="size-4" strokeWidth={1.5} />
          Invitar
        </span>
      </div>

      <div className="flex flex-col gap-6 p-5">
        <div>
          <p className="text-sm font-medium text-foreground">Personas con acceso</p>
          <ul className="mt-3 flex flex-col gap-1">
            {PREVIEW_MEMBERS.map((member) => (
              <li key={member.email} className="flex h-12 items-center gap-3">
                <MemberAvatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{member.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                    member.role === "Propietario"
                      ? "bg-primary/10 text-primary"
                      : "border border-border text-muted-foreground",
                  )}
                >
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Invitaciones pendientes</p>
          <div className="mt-3 flex h-10 items-center justify-between gap-3 rounded-lg border border-dashed border-border-strong px-3">
            <span className="truncate text-sm text-muted-foreground">{PREVIEW_PENDING_INVITE}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">Esperando respuesta</span>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Todos estudian sobre las mismas fuentes</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {PREVIEW_FILES_SHARED.map((name) => (
              <li
                key={name}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 text-xs text-foreground"
              >
                <FileText className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
