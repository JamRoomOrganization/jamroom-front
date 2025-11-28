"use client";

import React, {
  createContext,
  useCallback,
  useMemo,
  useState,
} from "react";

type ToastVariant = "success" | "error" | "info" | "warning";

export type Toast = {
  id: number;
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, "id">) => void;
  success: (
    description: string,
    options?: Omit<Partial<Toast>, "id" | "description" | "variant">
  ) => void;
  error: (
    description: string,
    options?: Omit<Partial<Toast>, "id" | "description" | "variant">
  ) => void;
  info: (
    description: string,
    options?: Omit<Partial<Toast>, "id" | "description" | "variant">
  ) => void;
  warning: (
    description: string,
    options?: Omit<Partial<Toast>, "id" | "description" | "variant">
  ) => void;
};

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined
);

let globalId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hide = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = ++globalId;
      const duration = toast.duration ?? 4000;

      setToasts((current) => [
        ...current,
        {
          id,
          variant: toast.variant ?? "info",
          ...toast,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => {
          hide(id);
        }, duration);
      }
    },
    [hide]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (description, options) =>
        show({ description, variant: "success", ...options }),
      error: (description, options) =>
        show({ description, variant: "error", ...options }),
      info: (description, options) =>
        show({ description, variant: "info", ...options }),
      warning: (description, options) =>
        show({ description, variant: "warning", ...options }),
    }),
    [show]
  );

  const getVariantClasses = (variant: ToastVariant | undefined) => {
    switch (variant) {
      case "success":
        return "border-emerald-500/70 bg-emerald-950/90 text-emerald-50";
      case "error":
        return "border-red-500/70 bg-red-950/90 text-red-50";
      case "warning":
        return "border-amber-500/70 bg-amber-950/90 text-amber-50";
      case "info":
      default:
        return "border-slate-500/70 bg-slate-900/95 text-slate-50";
    }
  };

  const getVariantIcon = (variant: ToastVariant | undefined) => {
    const common = "w-5 h-5";
    switch (variant) {
      case "success":
        return (
          <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m-1 14.414l-4.707-4.707l1.414-1.414L11 13.586l5.293-5.293l1.414 1.414z"
            />
          </svg>
        );
      case "error":
        return (
          <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m3.707 12.293l-1.414 1.414L12 13.414l-2.293 2.293l-1.414-1.414L10.586 12L8.293 9.707l1.414-1.414L12 10.586l2.293-2.293l1.414 1.414L13.414 12z"
            />
          </svg>
        );
      case "warning":
        return (
          <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M1 21h22L12 2zm12-3h-2v2h2zm0-6h-2v4h2z"
            />
          </svg>
        );
      case "info":
      default:
        return (
          <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2m1 15h-2v-6h2zm0-8h-2V7h2z"
            />
          </svg>
        );
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Contenedor visual de toasts */}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end justify-start gap-3 px-4 py-6 sm:px-6 sm:py-8">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg shadow-black/40 backdrop-blur ${getVariantClasses(
              toast.variant
            )}`}
          >
            <div className="mt-0.5 flex-shrink-0 text-current">
              {getVariantIcon(toast.variant)}
            </div>

            <div className="flex-1 text-sm">
              {toast.title && (
                <p className="font-semibold leading-snug">
                  {toast.title}
                </p>
              )}
              <p className="leading-snug">{toast.description}</p>
            </div>

            <button
              type="button"
              onClick={() => hide(toast.id)}
              className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs font-medium opacity-70 transition hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
