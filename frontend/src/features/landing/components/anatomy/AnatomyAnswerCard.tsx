import { CitationChip } from "../../../../shared/ui/CitationChip";
import { GeneralKnowledgeChip } from "../../../../shared/ui/GeneralKnowledgeChip";
import { ANATOMY_QUESTION, DNA_SOURCE, MITOCHONDRIA_SOURCE } from "../../utils/previewContent";

export function AnatomyAnswerCard() {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <p className="ml-auto max-w-[85%] rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground">
        {ANATOMY_QUESTION}
      </p>
      <div className="flex flex-col gap-4 text-base leading-7 text-foreground">
        <p>
          Las mitocondrias realizan la respiración celular y obtienen ATP a partir de la glucosa
          <CitationChip label={1} source={MITOCHONDRIA_SOURCE} />.
        </p>
        <p>
          Además, tienen ADN propio y se dividen de forma independiente, lo que respalda la teoría
          endosimbiótica
          <CitationChip label={2} source={DNA_SOURCE} />.
        </p>
        <p>
          Esta teoría fue propuesta por Lynn Margulis en 1967
          <GeneralKnowledgeChip />.
        </p>
      </div>
      <p className="border-t border-border pt-4 text-sm text-muted-foreground">
        Pasá el cursor sobre cada marca para ver de dónde sale
      </p>
    </div>
  );
}
