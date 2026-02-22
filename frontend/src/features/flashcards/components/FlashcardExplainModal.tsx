import { Streamdown } from "streamdown";

import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  term: string;
  explanationMarkdown: string;
  onClose: () => void;
};

export function FlashcardExplainModal({
  isOpen,
  isLoading,
  error,
  term,
  explanationMarkdown,
  onClose,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={term || "Tema"}
      maxWidth="4xl"
      className="max-h-[72vh] motion-reduce:animate-none [animation:ft-dropIn_280ms_cubic-bezier(0.22,1,0.36,1)]"
    >
      <div className="min-h-[320px] max-h-[58vh] overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-4" aria-label="Cargando explicacion">
            <div className="h-4 w-40 rounded bg-muted animate-pulse [animation-duration:1.2s]" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted animate-pulse [animation-duration:1.2s]" />
              <div className="h-3 w-[96%] rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:100ms]" />
              <div className="h-3 w-[92%] rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:180ms]" />
              <div className="h-3 w-[88%] rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:260ms]" />
              <div className="h-3 w-[94%] rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:340ms]" />
              <div className="h-3 w-[84%] rounded bg-muted animate-pulse [animation-duration:1.2s] [animation-delay:420ms]" />
            </div>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div
            role="alert"
            className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm text-error"
          >
            {error}
          </div>
        ) : null}

        {!isLoading && !error && explanationMarkdown ? (
          <div
            className="
              max-w-none text-sm leading-relaxed text-foreground
              [&_p]:my-2
              [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6
              [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6
              [&_li]:my-1
              [&_strong]:font-semibold
            "
          >
            <Streamdown>{explanationMarkdown}</Streamdown>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
