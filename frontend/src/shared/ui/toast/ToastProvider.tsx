import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Spinner } from "../Spinner";
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
        className="pointer-events-none fixed bottom-4 left-4 z-[100] flex w-[min(92vw,24rem)] flex-col items-start gap-2"
      >
        {toasts.map((toast) => {
          const baseClasses =
            "pointer-events-auto inline-flex min-h-10 w-fit max-w-[18rem] items-start gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium shadow-sm";

          const toneClasses =
            toast.variant === "success"
              ? "border-success/35 bg-success/10 text-success"
              : toast.variant === "error"
                ? "border-error/35 bg-error/10 text-error"
                : "border-primary/35 bg-primary/10 text-primary";

          return (
            <div key={toast.id} className={`${baseClasses} ${toneClasses}`} role="status">
              <span className="mt-0.5 shrink-0" aria-hidden="true">
                {toast.variant === "loading" ? (
                  <Spinner />
                ) : toast.variant === "success" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block whitespace-normal break-words [overflow-wrap:anywhere] leading-5">
                  {toast.title}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
