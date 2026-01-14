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
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[color:var(--color-fern-900)]"
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
            "h-11 w-full rounded-2xl bg-white px-4 text-sm text-[color:var(--color-fern-950)] ring-1 transition",
            "placeholder:text-[color:var(--color-fern-400)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-green-400)]",
            error
              ? "ring-[color:var(--color-fern-300)] focus-visible:ring-[color:var(--color-celadon-bright-500)]"
              : "ring-[color:var(--color-fern-200)]",
            (showPasswordToggle || Boolean(rightAdornment)) && "pr-12",
          )}
        />

        {rightAdornment ? (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[color:var(--color-fern-400)]">
            {rightAdornment}
          </div>
        ) : null}

        {showPasswordToggle ? (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((v) => !v)}
            className={cn(
              "absolute inset-y-0 right-2 flex items-center rounded-xl px-2 text-[color:var(--color-fern-500)] transition",
              "hover:text-[color:var(--color-fern-700)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-green-400)]",
            )}
            aria-label={isPasswordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden className="h-5 w-5" />
            ) : (
              <Eye aria-hidden className="h-5 w-5" />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm text-[color:var(--color-fern-700)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
