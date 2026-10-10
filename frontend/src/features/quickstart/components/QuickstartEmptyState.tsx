import { Button } from "../../../shared/ui/Button";
import { EmptyQuickstartIllustration } from "../../../shared/ui/illustrations/EmptyQuickstartIllustration";

type Props = {
  isGenerating: boolean;
  canGenerate: boolean;
  error: string | null;
  onGenerate: () => void;
};

export function QuickstartEmptyState({
  isGenerating,
  canGenerate,
  error,
  onGenerate,
}: Props) {
  return (
    <div className="flex h-full min-h-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-10 text-center">
        <EmptyQuickstartIllustration className="mx-auto h-auto w-40" />

        <h2 className="mt-4 text-lg font-semibold text-foreground">
          {isGenerating ? "Generando inicio rápido…" : "Todavía no hay inicio rápido"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-foreground/75">
          {canGenerate
            ? "Creá un resumen y una lista de temas a partir de tus fuentes para empezar a estudiar más rápido."
            : "Subí al menos un documento (PDF, DOCX, TXT o PPTX) y esperá a que aparezca como Listo para generar tu inicio rápido."}
        </p>

        {error ? (
          <div
            className="mt-4 rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex justify-center">
          <Button onClick={onGenerate} disabled={!canGenerate} loading={isGenerating}>
            Generar inicio rápido
          </Button>
        </div>

        {!canGenerate ? (
          <p className="mt-3 text-xs text-foreground/70" role="alert">
            Necesitás al menos una fuente con estado "Listo".
          </p>
        ) : null}
      </div>
    </div>
  );
}
