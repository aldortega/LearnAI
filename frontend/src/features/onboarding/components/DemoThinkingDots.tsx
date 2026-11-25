export function DemoThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1" role="status" aria-label="Generando respuesta">
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s] motion-reduce:animate-none" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s] motion-reduce:animate-none" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none" />
    </div>
  );
}
