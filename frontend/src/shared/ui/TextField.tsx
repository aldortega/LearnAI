import { useId, useMemo, useState } from "react";

import { Eye, EyeOff } from "lucide-react";

import { cn } from "../lib/cn";

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "password" | "date";
  autoComplete?: string;
  error?: string;
  required?: boolean;
  rightAdornment?: React.ReactNode;
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
}: Props) {
  const id = useId();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const inputType = useMemo(() => {
    if (type !== "password") return type;
    return isPasswordVisible ? "text" : "password";
  }, [isPasswordVisible, type]);

  const showPasswordToggle = type === "password";

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700"
      >
        {label}
        {required ? (
          <span className="text-[color:var(--color-fern-600)]"> *</span>
        ) : null}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={inputType}
          autoComplete={autoComplete}
          required={required}
          className={cn(
            "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition-all duration-200",
            "placeholder:text-zinc-400",
            "focus:border-[color:var(--color-fern-600)] focus:ring-1 focus:ring-[color:var(--color-fern-600)] focus:outline-none",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
              : "hover:border-zinc-300",
            (showPasswordToggle || Boolean(rightAdornment)) && "pr-10",
          )}
        />

        {rightAdornment ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
            {rightAdornment}
          </div>
        ) : null}

        {showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((v) => !v)}
            className={cn(
              "absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-zinc-400 transition",
              "hover:text-zinc-600",
              "focus:outline-none focus:ring-2 focus:ring-[color:var(--color-fern-600)]",
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
        <p
          role="alert"
          className="text-sm text-red-600"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
