import type { ChangeEvent, InputHTMLAttributes } from "react";
import { useId, useMemo, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "../lib/cn";

type Props = {
  label: string;
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "date";
  autoComplete?: string;
  error?: string;
  required?: boolean;
  rightAdornment?: React.ReactNode;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};

export function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  error,
  required,
  rightAdornment,
  inputProps,
}: Props) {
  const id = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType = useMemo(() => {
    if (type !== "password") return type;
    return isPasswordVisible ? "text" : "password";
  }, [isPasswordVisible, type]);

  const showPasswordToggle = type === "password";
  const inputId = inputProps?.id ?? id;
  const inputName = inputProps?.name ?? name;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    inputProps?.onChange?.(event);
    onChange?.(event.target.value);
  };

  const mergedInputProps: InputHTMLAttributes<HTMLInputElement> = {
    ...inputProps,
    id: inputId,
    name: inputName,
    placeholder,
    type: inputType,
    autoComplete,
    required,
    onChange: handleChange,
  };

  if (value !== undefined) {
    mergedInputProps.value = value;
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </label>

      <div className="relative">
        <input
          {...mergedInputProps}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground transition-all duration-200",
            "placeholder:text-muted-foreground",
            "focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none",
            error
              ? "border-error focus:border-error focus:ring-error"
              : "hover:border-border-strong",
            (showPasswordToggle || Boolean(rightAdornment)) && "pr-10",
          )}
        />

        {rightAdornment ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            {rightAdornment}
          </div>
        ) : null}

        {showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((v) => !v)}
            className={cn(
              "absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-muted-foreground transition",
              "hover:text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
            )}
            aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden className="h-4 w-4" />
            ) : (
              <Eye aria-hidden className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
