type Props = {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function ReportPromptEditor({ value, disabled, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Prompt del informe
      </label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        maxLength={12000}
        className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      <p className="text-xs text-muted-foreground">{value.length}/12000</p>
    </div>
  );
}
