import { useCallback, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { ToastContext, type ToastPayload } from "./toastContext";

type Toast = ToastPayload & {
  id: number;
  key?: string;
};

const TOAST_DURATION_MS = 4500;

type Props = {
  children: React.ReactNode;
};

export function ToastProvider({ children }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((toast: ToastPayload) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { ...toast, id }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const upsertToast = useCallback((key: string, toast: ToastPayload) => {
    setToasts((current) => {
      const index = current.findIndex((item) => item.key === key);
      if (index === -1) {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        return [...current, { ...toast, id, key }];
      }

      const next = [...current];
      next[index] = { ...next[index], ...toast, key };
      return next;
    });
  }, []);

  const removeToast = useCallback((key: string) => {
    setToasts((current) => current.filter((item) => item.key !== key));
  }, []);

  const value = useMemo(
    () => ({ pushToast, upsertToast, removeToast }),
    [pushToast, removeToast, upsertToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-4 z-[100] flex w-[min(92vw,24rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border px-3 py-2 shadow-lg ${
              toast.variant === "success"
                ? "border-emerald-500/40 bg-emerald-500/10"
                : toast.variant === "error"
                  ? "border-red-500/40 bg-red-500/10"
                  : "border-sky-500/40 bg-sky-500/10"
            }`}
            role="status"
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              {toast.variant === "loading" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {toast.title}
            </p>
            {toast.description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
