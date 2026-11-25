import { ArrowUp } from "lucide-react";

type Props = {
  value: string;
  isTyping: boolean;
};

export function DemoComposer({ value, isTyping }: Props) {
  const canSend = isTyping && value.length > 0;
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface py-1.5 pr-1.5 pl-4 shadow-sm">
      <span className="flex min-h-5 flex-1 items-center text-sm text-foreground">
        {value ? value : <span className="text-muted-foreground">Preguntá sobre tus fuentes…</span>}
        {isTyping ? (
          <span
            className="ml-px inline-block h-4 w-0.5 animate-caret-blink bg-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : null}
      </span>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
          canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
        aria-hidden="true"
      >
        <ArrowUp className="h-4 w-4" />
      </span>
    </div>
  );
}
