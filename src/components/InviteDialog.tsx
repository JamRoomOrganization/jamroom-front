"use client";

import React from "react";

type InviteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
};

export default function InviteDialog({
  open,
  onOpenChange,
  roomId,
}: InviteDialogProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // En caso de fallo podrías mostrar un toast externo
    }
  }

  const handleClose = () => onOpenChange(false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700/80 shadow-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-white text-lg sm:text-xl font-semibold">
              Invitar a la sala
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Comparte este enlace para que otras personas puedan unirse.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Enlace + botón copiar */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-100 border border-slate-700 text-xs sm:text-sm truncate"
            />
            <button
              onClick={copy}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs sm:text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-colors"
            >
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-500">
            Cualquiera con este enlace podrá unirse a la sala, según los
            permisos configurados por el host.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-100 text-xs sm:text-sm hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

