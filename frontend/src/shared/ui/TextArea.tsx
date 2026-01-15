import type { ChangeEvent, TextareaHTMLAttributes } from "react";
import { useId } from "react";

import { cn } from "../lib/cn";

type Props = {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  rows?: number;
  inputProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
};

export function TextArea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  required,
  rows = 3,
  inputProps,
}: Props) {
  const id = useId();
  const inputId = inputProps?.id ?? id;
  const inputName = inputProps?.name ?? name;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    inputProps?.onChange?.(event);
    onChange?.(event.target.value);
  };

  const mergedInputProps: TextareaHTMLAttributes<HTMLTextAreaElement> = {
    ...inputProps,
    id: inputId,
    name: inputName,
    placeholder,
    rows,
    required,
    onChange: handleChange,
  };

  if (value !== undefined) {
    mergedInputProps.value = value;
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-zinc-700"
      >
        {label}
        {required ? <span className="text-emerald-600"> *</span> : null}
      </label>

      <textarea
        {...mergedInputProps}
        className={cn(
          "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-all duration-200",
          "placeholder:text-zinc-400",
          "focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none",
          "resize-none",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "hover:border-zinc-300",
        )}
      />

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
