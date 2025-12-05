"use client";

import React from "react";
import { useRouter } from "next/navigation";

type JoinPrivateRoomDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JoinPrivateRoomDialog({
  open,
  onOpenChange,
}: JoinPrivateRoomDialogProps) {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setCode("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError("Ingresa el código de la sala.");
      return;
    }

    // TODO: aquí luego se resuelve el código contra backend (join-by-code)
    // Por ahora, como es mock, mandamos a una sala cualquiera (ej: "1")
    router.push("/room/1");
    onOpenChange(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-1.5">
          Unirse a una sala privada
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-4">
          Ingresa el código que te compartieron para unirte directamente a la sala.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Código de sala
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: JAM-4F9Q, ROOM-123..."
              className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-100 placeholder:text-slate-500 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium text-slate-200 border border-slate-600 hover:border-slate-400 bg-slate-900/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all"
            >
              Ingresar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
