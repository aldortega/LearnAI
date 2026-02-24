import { createContext } from "react";

type ToastVariant = "success" | "error" | "loading";

export type ToastPayload = {
  title: string;
  description?: string;
  variant: ToastVariant;
};

export type ToastContextValue = {
  pushToast: (toast: ToastPayload) => void;
  upsertToast: (key: string, toast: ToastPayload) => void;
  removeToast: (key: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
