import { DNA_SOURCE, MITOCHONDRIA_SOURCE } from "../../utils/previewContent";
import { CitationMark } from "../CitationMark";
import { GeneralKnowledgeMark } from "./GeneralKnowledgeMark";

export function AnatomyNotes() {
  return (
    <ol className="flex flex-col divide-y divide-border">
      <li className="flex gap-4 pb-6">
        <CitationMark label={1} />
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">Cita a la página exacta</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {MITOCHONDRIA_SOURCE.file_name} · p. {MITOCHONDRIA_SOURCE.page}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            <mark className="rounded-sm bg-primary/15 px-0.5 text-foreground [box-decoration-break:clone]">
              {MITOCHONDRIA_SOURCE.snippet}
            </mark>
          </p>
        </div>
      </li>
      <li className="flex gap-4 py-6">
        <CitationMark label={2} />
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">Cada afirmación, su fuente</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{DNA_SOURCE.file_name}</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Si una respuesta combina varios documentos, cada parte indica de cuál sale
          </p>
        </div>
      </li>
      <li className="flex gap-4 pt-6">
        <GeneralKnowledgeMark />
        <div className="min-w-0">
          <h3 className="text-base font-medium text-foreground">
            Te avisa cuando no está en tus fuentes
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Lo que sale de conocimiento general queda marcado, para que sepas qué verificar
          </p>
        </div>
      </li>
    </ol>
  );
}
